/** @file 提供多字段、多动作的模型控制器。生成稳定操作入口和只读展示快照，管理草稿字段、输入变化、任务提交、取消和生命周期。 */
import type { ControllerPorts, TaskPreparation, TaskStatus, ToolController } from "./ports";
import { freezeSnapshot } from "./snapshot";
/** 从模型投影中提取动作类型，与只读展示字段分开对外提供。 */
type ModelActions<M> = {
  [K in keyof M as M[K] extends (...args: never[]) => unknown ? K : never]: M[K];
};
/** 移除操作函数后的展示字段，附加任务状态与草稿保留状态。 */
type ModelState<M> = Omit<M, keyof ModelActions<M>> & { status: TaskStatus; retained: boolean };
/** 允许直接值或基于最新值的函数更新，供多字段模型的稳定动作使用。 */
export type Setter<T> = (value: T | ((current: T) => T)) => void;
/** 模型提交后台任务的入口，准备资源和结果提交都遵循当前输入版本。 */
export type RunTask = <O>(
  operation: string,
  input: unknown,
  receive: (output: O) => void,
  prepare?: TaskPreparation<unknown>,
) => void;
let modelSequence = 0;
/**
 * 将输入模型和展示投影组织为可订阅控制器，返回只读快照、稳定动作与生命周期入口。
 * @param initial 初始字段，创建和释放后重建时复制，避免与调用方共享可变对象。
 * @param project 从最新 state 投影展示字段与操作，操作实现留在内部方法表。
 * @param ports 注入任务、草稿和日志能力，保持模型独立于浏览器与 React。
 * @param persisted 离开时允许保存的输入字段，默认取 initial 的全部字段。
 * @param invalidate 输入改变时要清空的结果和状态字段，避免继续展示旧输出。
 * @param inputKeys 哪些字段变化需要取消旧任务，默认与 persisted 相同。
 */
export function createModelController<S extends object, M extends object>(
  id: string,
  initial: S,
  project: (
    state: S,
    set: <K extends keyof S>(key: K, value: S[K] | ((current: S[K]) => S[K])) => void,
    run: RunTask,
  ) => M,
  ports: ControllerPorts,
  persisted: readonly (keyof S)[] = Object.keys(initial) as (keyof S)[],
  invalidate: Partial<S> = {},
  inputKeys = persisted,
) {
  let state = structuredClone(initial);
  let active = false;
  const listeners = new Set<() => void>();
  const scope = `${id}:model:${++modelSequence}`;
  let revision = 0;
  let status: TaskStatus = "idle";
  let snapshot: Readonly<ModelState<M>>;
  // 稳定的公开动作转发到最新投影函数，使订阅者缓存动作引用后仍能读取当前模型。
  const methods: Record<string, (...args: unknown[]) => unknown> = {};
  /** 仅投影明确允许保留的字段，返回用于草稿预算判断和离开时保存的数据。 */
  const draft = () => Object.fromEntries(persisted.map((key) => [key, state[key]]));
  /** 由当前模型派生展示字段，动作更新到内部方法表，冻结并返回非函数字段快照。 */
  function projectSnapshot() {
    const fields: Record<string, unknown> = {};
    // 将操作函数留在内部方法表，快照只包含展示字段，避免界面持有可变资源。
    for (const [key, value] of Object.entries(project(state, set, run) as object)) {
      if (typeof value === "function") methods[key] = value as (...args: unknown[]) => unknown;
      else fields[key] = value;
    }
    return freezeSnapshot({
      ...fields,
      status,
      retained: !persisted.length || ports.drafts.accepts(draft()),
    }) as Readonly<ModelState<M>>;
  }
  /** 重新投影当前模型并通知订阅者，保持展示快照与动作实现同步。 */
  function publish() {
    snapshot = projectSnapshot();
    for (const listener of listeners) listener();
  }
  /** 更新 key 字段；函数式 value 读取最新模型，输入字段变化同时撤销旧任务并应用失效状态。 */
  function set<K extends keyof S>(key: K, value: S[K] | ((current: S[K]) => S[K])) {
    const next =
      typeof value === "function" ? (value as (current: S[K]) => S[K])(state[key]) : value;
    // 输入相关字段变化立即废弃旧任务；输出字段提交不应再次取消自身计算。
    if (inputKeys.includes(key)) {
      revision++;
      ports.tasks.cancel(scope);
      status = "idle";
      state = { ...state, ...invalidate };
    }
    state = { ...state, [key]: next };
    publish();
  }
  /** 提交 operation 与 input，prepare 可异步读取文件；只将当前输入版本的成功结果交给 receive。 */
  const run: RunTask = (operation, input, receive, prepare) => {
    revision++;
    const version = revision;
    if (!active) return;
    status = "running";
    state = { ...state, busy: true, error: "", operationError: "" };
    publish();
    const handle = ports.tasks.run<unknown, unknown>({
      scope,
      toolId: id,
      operation,
      input,
      revision: version,
      ...(prepare ? { prepare } : {}),
    });
    void handle.result
      .then((result) => {
        // 响应必须属于当前激活实例与输入版本，离开或编辑后直接丢弃。
        if (!active || revision !== version) return;
        status = result.ok ? "success" : result.error.kind === "cancelled" ? "cancelled" : "failed";
        state = { ...state, busy: false };
        publish();
        if (result.ok) receive(result.value as Parameters<typeof receive>[0]);
        else if (result.error.kind !== "cancelled") {
          state = { ...state, error: result.error.message, operationError: result.error.message };
          publish();
        }
      })
      .catch(() => {
        if (!active || revision !== version) return;
        status = "failed";
        state = {
          ...state,
          ...invalidate,
          busy: false,
          error: "结果暂时无法显示，请重新执行。",
          operationError: "结果暂时无法显示，请重新执行。",
        };
        try {
          ports.logger.emit({
            level: "error",
            event: "controller.commit.failed",
            toolId: id,
            operation,
            taskId: handle.id,
            errorCode: "controller.commit",
          });
        } catch {
          /* 诊断属于辅助能力，记录失败后仍继续发布可恢复的错误状态。 */
        }
        publish();
      });
  };
  snapshot = projectSnapshot();
  // 只创建一份动作包装，对外引用稳定，内部调用始终转发到最新实现。
  const actions = Object.freeze({
    ...Object.fromEntries(
      Object.keys(methods).map((key) => [key, (...args: unknown[]) => methods[key]?.(...args)]),
    ),
    set,
    /** 使当前任务失效并释放等待或运行资源，后续迟到响应不会覆盖新的输入。 */
    cancel() {
      revision++;
      ports.tasks.cancel(scope);
      status = "cancelled";
      state = { ...state, busy: false };
      publish();
    },
  }) as ModelActions<M> & { set: typeof set; cancel(): void };
  return {
    getSnapshot: () => snapshot,
    /** 注册 listener 并返回退订函数，使组件或事件拥有者能在离开时释放订阅。 */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** 在挂载后恢复白名单输入字段，重复激活不会再次覆盖当前模型。 */
    activate() {
      if (active) return;
      active = true;
      const draft = ports.drafts.get(id);
      if (typeof draft === "object" && draft !== null) {
        for (const key of persisted) {
          if (Object.hasOwn(draft, key)) state = { ...state, [key]: (draft as S)[key] };
        }
        publish();
      }
    },
    /** 标记实例失活并释放任务，保存白名单输入字段后重建初始模型，丢弃运行资源。 */
    dispose() {
      if (!active) return;
      active = false;
      revision++;
      ports.tasks.release(scope);
      // 释放时只保存允许的输入字段，再重建初始模型以丢弃文件、结果和错误。
      const saved = draft();
      if (persisted.length) ports.drafts.set(id, saved);
      status = "idle";
      state = { ...structuredClone(initial), ...saved };
      publish();
    },
    actions,
  } satisfies ToolController<ModelState<M>, ModelActions<M> & { set: typeof set; cancel(): void }>;
}
