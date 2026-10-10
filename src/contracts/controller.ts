/** @file 提供通用单操作控制器。管理输入草稿、结果、错误、任务状态、防抖、取消、草稿恢复、重置及释放。 */
import type { ControllerPorts, TaskHandle, TaskStatus, ToolController } from "./ports";
import type { AppError } from "./result";
import { freezeSnapshot } from "./snapshot";
/** 单操作控制器的只读展示状态，区分草稿、输出、运行状态与保留能力。 */
export type OperationState<D, O> = Readonly<{
  draft: D;
  output: O;
  status: TaskStatus;
  error: AppError | null;
  retained: boolean;
}>;
// 每个控制器实例使用独立作用域，避免同一工具的不同实例互相取消任务。
let scopeSequence = 0;

/**
 * 通过 options.ports 管理单次或自动计算，返回快照、动作和激活/释放入口。
 * initial 与 empty 分别定义初始输入和空输出；restore/serialize 控制草稿校验与保存。
 * automatic 从草稿派生任务或返回 null，debounceMs 合并连续输入，timeoutMs 限制执行时长。
 * retain 为 false 时不读取和保存草稿；任务完成后仍需核验输入版本才能提交结果。
 */
export function createOperationController<D, O>(options: {
  id: string;
  initial: D;
  empty: O;
  ports: ControllerPorts;
  restore?: (value: unknown, fallback: D) => D;
  serialize?: (draft: D) => unknown;
  retain?: boolean;
  debounceMs?: number;
  timeoutMs?: number;
  automatic?: (draft: D) => { operation: string; input: unknown } | null;
}) {
  const { ports, id } = options;
  const scope = `${id}:${++scopeSequence}`;
  let state: OperationState<D, O> = freezeSnapshot({
    draft: options.initial,
    output: options.empty,
    status: "idle",
    error: null,
    retained: true,
  });
  let active = false;
  let revision = 0;
  let current: TaskHandle<O> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  /** 生成并发布新的只读状态快照，通知订阅者更新界面而不暴露内部可变资源。 */
  function publish(patch: Partial<OperationState<D, O>>) {
    state = freezeSnapshot({ ...state, ...patch });
    for (const listener of listeners) listener();
  }
  /** 推进输入版本并清理防抖和任务，使所有已发出的旧计算响应失效。 */
  function cancel() {
    revision++;
    clearTimeout(timer);
    timer = undefined;
    current?.cancel();
    current = null;
    ports.tasks.cancel(scope);
  }
  /** 提交 operation 与 input 的本次计算；transfer 指定移交的缓冲区，只有当前版本有效时提交结果。 */
  async function run(operation: string, input: unknown, transfer?: readonly ArrayBuffer[]) {
    cancel();
    if (!active) return;
    // 固定本次输入版本；等待期间的编辑、取消或卸载都会推进 revision。
    const version = revision;
    publish({ output: options.empty, status: "running", error: null });
    const handle = ports.tasks.run<unknown, O>({
      scope,
      toolId: id,
      operation,
      revision: version,
      input,
      ...(transfer ? { transfer } : {}),
      timeoutMs: options.timeoutMs ?? 30_000,
    });
    current = handle;
    const result = await handle.result;
    // 只接纳仍激活、输入版本未变化且句柄一致的响应，防止迟到结果覆盖新输入。
    if (!active || revision !== version || current !== handle) return;
    current = null;
    if (result.ok) publish({ output: result.value, status: "success" });
    else
      publish({
        status: result.error.kind === "cancelled" ? "cancelled" : "failed",
        error: result.error.kind === "cancelled" ? null : result.error,
      });
  }
  /** 根据当前输入派生自动操作并防抖提交，使连续编辑合并成一次后台计算。 */
  function schedule() {
    const operation = options.automatic?.(state.draft);
    if (!operation || !active) return;
    publish({ status: "pending" });
    timer = setTimeout(() => {
      timer = undefined;
      void run(operation.operation, operation.input);
    }, options.debounceMs ?? 150);
  }
  const actions = {
    /** 替换 draft，立即取消旧任务并清空输出，再按配置安排自动计算和草稿保留提示。 */
    update(draft: D) {
      cancel();
      publish({
        draft,
        output: options.empty,
        error: null,
        status: "idle",
        // 保留能力随输入即时计算，页面无需等到离开后才知道草稿超额。
        retained:
          options.retain === false || ports.drafts.accepts(options.serialize?.(draft) ?? draft),
      });
      schedule();
    },
    run,
    /** 推进输入版本并清理防抖和任务，使所有已发出的旧计算响应失效。 */
    cancel() {
      cancel();
      publish({ status: "cancelled", error: null });
    },
    /** 取消当前操作并发布 error，供运行前的输入校验或能力检查向页面报告失败。 */
    reject(error: AppError) {
      cancel();
      publish({ output: options.empty, status: "failed", error });
    },
    /** 删除已保存草稿并恢复 initial，清空结果、错误和运行状态。 */
    reset() {
      cancel();
      ports.drafts.delete(id);
      publish({
        draft: options.initial,
        output: options.empty,
        status: "idle",
        error: null,
        retained: true,
      });
    },
  };
  const controller: ToolController<OperationState<D, O>, typeof actions> = {
    getSnapshot: () => state,
    /** 注册 listener 并返回退订函数，使组件或事件拥有者能在离开时释放订阅。 */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** 在挂载后恢复允许的输入草稿并安排自动计算，重复激活不会重复初始化任务。 */
    activate() {
      if (active) return;
      active = true;
      // 在激活阶段恢复内存草稿，使渲染与预渲染阶段保持纯净。
      const restored =
        options.retain === false
          ? state.draft
          : (options.restore?.(ports.drafts.get(id), state.draft) ?? state.draft);
      publish({ draft: restored, status: "idle" });
      schedule();
    },
    /** 标记实例失活并释放任务，按策略保存输入草稿，清空结果、错误和运行状态。 */
    dispose() {
      if (!active) return;
      active = false;
      cancel();
      // 离开页面必须释放可复用 Worker；仅取消当前任务不足以清理空闲线程。
      ports.tasks.release(scope);
      const retained =
        options.retain === false ||
        ports.drafts.set(id, options.serialize?.(state.draft) ?? state.draft);
      publish({ output: options.empty, status: "idle", error: null, retained });
    },
    actions,
  };
  return controller;
}
