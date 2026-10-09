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
type Slot = { worker: WorkerPort; pending: { id: string; cancel(): void } | null };
export function createTaskExecutor(
  factories: Readonly<Record<string, WorkerFactory>>,
  logger: Logger,
  clock: ClockPort,
): TaskExecutor {
  const slots = new Map<string, Slot>();
  let sequence = 0;
  function record(event: Parameters<Logger["emit"]>[0]) {
    try {
      logger.emit(event);
    } catch {
      /* Logging must not change a task's outcome. */
    }
  }
  function release(scope: string) {
    const slot = slots.get(scope);
    if (!slot) return;
    slot.pending?.cancel();
    slot.worker.terminate();
    slots.delete(scope);
  }
  return {
    run<I, O>(request: TaskRequest<I>): TaskHandle<O> {
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
      function complete(outcome: Result<O>, terminate = false) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (terminate) {
          for (const listener of cancellation) {
            try {
              listener();
            } catch {
              /* Continue releasing all resources. */
            }
          }
        }
        cancellation.clear();
        if (slot) {
          slot.pending = null;
          slot.worker.onmessage = null;
          slot.worker.onerror = null;
          slot.worker.onmessageerror = null;
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
          if (
            response.taskId !== id ||
            response.scope !== request.scope ||
            response.revision !== request.revision ||
            response.toolId !== request.toolId ||
            response.operation !== request.operation
          )
            return;
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
                  get aborted() {
                    return settled;
                  },
                  onCancel(listener) {
                    cancellation.add(listener);
                    return () => {
                      cancellation.delete(listener);
                    };
                  },
                })
              : { input: request.input, transfer: request.transfer };
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
    cancel(scope) {
      slots.get(scope)?.pending?.cancel();
    },
    release,
  };
}
