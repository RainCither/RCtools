import type { ControllerPorts, TaskPreparation, TaskStatus, ToolController } from "./ports";
import { freezeSnapshot } from "./snapshot";
type ModelActions<M> = {
  [K in keyof M as M[K] extends (...args: never[]) => unknown ? K : never]: M[K];
};
type ModelState<M> = Omit<M, keyof ModelActions<M>> & { status: TaskStatus; retained: boolean };
export type Setter<T> = (value: T | ((current: T) => T)) => void;
export type RunTask = <O>(
  operation: string,
  input: unknown,
  receive: (output: O) => void,
  prepare?: TaskPreparation<unknown>,
) => void;
let modelSequence = 0;
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
  const methods: Record<string, (...args: unknown[]) => unknown> = {};
  const draft = () => Object.fromEntries(persisted.map((key) => [key, state[key]]));
  function projectSnapshot() {
    const fields: Record<string, unknown> = {};
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
  function publish() {
    snapshot = projectSnapshot();
    for (const listener of listeners) listener();
  }
  function set<K extends keyof S>(key: K, value: S[K] | ((current: S[K]) => S[K])) {
    const next =
      typeof value === "function" ? (value as (current: S[K]) => S[K])(state[key]) : value;
    if (inputKeys.includes(key)) {
      revision++;
      ports.tasks.cancel(scope);
      status = "idle";
      state = { ...state, ...invalidate };
    }
    state = { ...state, [key]: next };
    publish();
  }
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
          /* Diagnostics are optional. */
        }
        publish();
      });
  };
  snapshot = projectSnapshot();
  const actions = Object.freeze({
    ...Object.fromEntries(
      Object.keys(methods).map((key) => [key, (...args: unknown[]) => methods[key]?.(...args)]),
    ),
    set,
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
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
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
    dispose() {
      if (!active) return;
      active = false;
      revision++;
      ports.tasks.release(scope);
      const saved = draft();
      if (persisted.length) ports.drafts.set(id, saved);
      status = "idle";
      state = { ...structuredClone(initial), ...saved };
      publish();
    },
    actions,
  } satisfies ToolController<ModelState<M>, ModelActions<M> & { set: typeof set; cancel(): void }>;
}
