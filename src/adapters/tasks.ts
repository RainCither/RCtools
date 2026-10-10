/** @file Worker 任务执行器。创建和复用后台线程，校验任务响应标识，处理取消、超时、文件读取准备、缓冲区转移及资源释放。 */
import type {
  ClockPort,
  Logger,
  TaskExecutor,
  TaskHandle,
  TaskRequest,
  WorkerFactory,
  WorkerPort,
  WorkerResponse,
} from "../contracts/ports";
import type { Result } from "../contracts/result";
import { failure, isAppError, normalizeError } from "../contracts/result";
/** 按任务作用域保存可复用 Worker 与当前待完成任务，释放时一起清理。 */
type Slot = { worker: WorkerPort; pending: { id: string; cancel(): void } | null };
/** 通过 factories、logger 和 clock 运行后台任务，返回按作用域取消、复用和释放 Worker 的执行接口。 */
export function createTaskExecutor(
  factories: Readonly<Record<string, WorkerFactory>>,
  logger: Logger,
  clock: ClockPort,
): TaskExecutor {
  const slots = new Map<string, Slot>();
  let sequence = 0;
  /** 隔离诊断写入失败，确保任务的成功、失败和资源清理不依赖日志能力。 */
  function record(event: Parameters<Logger["emit"]>[0]) {
    try {
      logger.emit(event);
    } catch {
      /* 日志失败不应改变任务结果，否则诊断故障会连带中断正常计算。 */
    }
  }
  /** 终止 scope 的当前任务和 Worker 并删除槽位，供取消后的清理或页面离开调用。 */
  function release(scope: string) {
    const slot = slots.get(scope);
    if (!slot) return;
    slot.pending?.cancel();
    slot.worker.terminate();
    slots.delete(scope);
  }
  return {
    /** 按 request 的作用域执行最新任务，验证 Worker 响应与输入版本，返回可取消句柄及结果 Promise。 */
    run<I, O>(request: TaskRequest<I>): TaskHandle<O> {
      // 同一作用域只运行最新请求，先取消旧任务才能避免并发响应混写。
      slots.get(request.scope)?.pending?.cancel();
      const id = `${request.scope}:${++sequence}`;
      const started = clock.monotonic();
      let finish: (result: Result<O>) => void = () => {};
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cancellation = new Set<() => void>();
      const result = new Promise<Result<O>>((resolve) => {
        finish = resolve;
      });
      let slot = slots.get(request.scope);
      /** 只结算一次 outcome，清理超时和回调；terminate 决定是否中止准备资源并销毁 Worker。 */
      function complete(outcome: Result<O>, terminate = false) {
        // 取消、超时和线程响应可能竞争，结果只能结算一次。
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // 终止分支同时通知准备阶段取消，文件读取也必须随任务结束。
        if (terminate) {
          for (const listener of cancellation) {
            try {
              listener();
            } catch {
              /* 单个取消回调失败后继续清理，确保其他读取和线程资源仍被释放。 */
            }
          }
        }
        cancellation.clear();
        if (slot) {
          slot.pending = null;
          slot.worker.onmessage = null;
          slot.worker.onerror = null;
          slot.worker.onmessageerror = null;
          // 正常完成保留线程供后续复用，取消、超时或协议故障则销毁该通道。
          if (terminate) {
            slot.worker.terminate();
            slots.delete(request.scope);
          }
        }
        const code = outcome.ok ? undefined : outcome.error.code;
        const kind = outcome.ok ? "success" : outcome.error.kind;
        record({
          level:
            kind === "success" || kind === "cancelled"
              ? "info"
              : kind === "validation"
                ? "debug"
                : kind === "timeout" || kind === "unsupported"
                  ? "warn"
                  : "error",
          event: `task.${kind}`,
          toolId: request.toolId,
          operation: request.operation,
          taskId: id,
          durationMs: clock.monotonic() - started,
          ...(code ? { errorCode: code } : {}),
        });
        finish(outcome);
      }
      /** 中止指定作用域或当前任务并归为正常取消，终止 Worker 以停止不可协作的计算。 */
      const cancel = () =>
        complete({ ok: false, error: failure("cancelled", "task.cancelled", "已取消。") }, true);
      try {
        if (!slot) {
          const factory = factories[request.toolId];
          if (!factory) throw new Error("Worker unavailable");
          slot = { worker: factory(), pending: null };
          slots.set(request.scope, slot);
        }
        slot.pending = { id, cancel };
        slot.worker.onmessage = (event) => {
          const data = event.data;
          if (typeof data !== "object" || data === null || !("taskId" in data)) {
            complete(
              {
                ok: false,
                error: failure("execution", "worker.protocol", "工具响应异常，请重新执行。"),
              },
              true,
            );
            return;
          }
          const response = data as WorkerResponse;
          // 校验完整任务信封，任何标识或输入版本不匹配的旧响应都不提交。
          if (
            response.taskId !== id ||
            response.scope !== request.scope ||
            response.revision !== request.revision ||
            response.toolId !== request.toolId ||
            response.operation !== request.operation
          )
            return;
          // 将畸形结果视为协议故障并隔离线程，防止未知结构进入控制器快照。
          if (
            !response.result ||
            typeof response.result.ok !== "boolean" ||
            (response.result.ok && !("value" in response.result)) ||
            (!response.result.ok && !isAppError(response.result.error))
          ) {
            complete(
              {
                ok: false,
                error: failure("execution", "worker.protocol", "工具响应异常，请重新执行。"),
              },
              true,
            );
            return;
          }
          complete(
            response.result as Result<O>,
            !response.result.ok && response.result.error.kind === "resource",
          );
        };
        slot.worker.onerror = (event) => {
          event.preventDefault();
          complete(
            {
              ok: false,
              error: failure("execution", "worker.failed", "计算过程发生异常，请重新执行。"),
            },
            true,
          );
        };
        slot.worker.onmessageerror = () =>
          complete(
            {
              ok: false,
              error: failure("execution", "worker.protocol", "计算结果无法读取，请重新执行。"),
            },
            true,
          );
        // 为准备与计算整体设置截止时间，卡住的读取或正则都能由拥有者中止。
        timer = setTimeout(
          () =>
            complete(
              {
                ok: false,
                error: failure(
                  "timeout",
                  "task.timeout",
                  request.timeoutMs === 2_000
                    ? "正则计算超过 2 秒，已停止。请简化表达式或缩短测试文本后重试。"
                    : "计算超过 30 秒，已停止。请缩短输入后重试。",
                ),
              },
              true,
            ),
          request.timeoutMs ?? 30_000,
        );
        record({
          level: "info",
          event: "task.started",
          toolId: request.toolId,
          operation: request.operation,
          taskId: id,
        });
        const worker = slot.worker;
        void Promise.resolve()
          .then(async () => {
            const prepared = request.prepare
              ? await request.prepare({
                  /** 读取任务是否已结算，供异步准备阶段判断取消、超时或其他结束路径。 */
                  get aborted() {
                    return settled;
                  },
                  /** 注册 listener 并返回退订函数，使文件读取等准备资源能跟随任务取消一起释放。 */
                  onCancel(listener) {
                    cancellation.add(listener);
                    return () => {
                      cancellation.delete(listener);
                    };
                  },
                })
              : { input: request.input, transfer: request.transfer };
            // 异步读取完成后再次检查结算状态，防止取消后仍把字节发送给线程。
            if (!settled)
              worker.postMessage(
                {
                  scope: request.scope,
                  taskId: id,
                  toolId: request.toolId,
                  operation: request.operation,
                  revision: request.revision,
                  input: prepared.input,
                },
                prepared.transfer,
              );
          })
          .catch((error) => complete({ ok: false, error: normalizeError(error) }, true));
      } catch {
        complete(
          {
            ok: false,
            error: failure(
              "unsupported",
              "worker.unavailable",
              "无法启动后台计算，请检查浏览器支持后重试。",
            ),
          },
          true,
        );
      }
      return { id, cancel, result };
    },
    /** 中止指定作用域或当前任务并归为正常取消，终止 Worker 以停止不可协作的计算。 */
    cancel(scope) {
      slots.get(scope)?.pending?.cancel();
    },
    release,
  };
}
