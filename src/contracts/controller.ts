import type { ControllerPorts, TaskHandle, TaskStatus, ToolController } from "./ports";
import type { AppError } from "./result";
import { freezeSnapshot } from "./snapshot";
export type OperationState<D, O> = Readonly<{
  draft: D;
  output: O;
  status: TaskStatus;
  error: AppError | null;
  retained: boolean;
}>;
let scopeSequence = 0;

/** Portable controller; only draft data survives disposal. No React or browser resources. */
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
  function publish(patch: Partial<OperationState<D, O>>) {
    state = freezeSnapshot({ ...state, ...patch });
    for (const listener of listeners) listener();
  }
  function cancel() {
    revision++;
    clearTimeout(timer);
    timer = undefined;
    current?.cancel();
    current = null;
    ports.tasks.cancel(scope);
  }
  async function run(operation: string, input: unknown, transfer?: readonly ArrayBuffer[]) {
    cancel();
    if (!active) return;
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
    if (!active || revision !== version || current !== handle) return;
    current = null;
    if (result.ok) publish({ output: result.value, status: "success" });
    else
      publish({
        status: result.error.kind === "cancelled" ? "cancelled" : "failed",
        error: result.error.kind === "cancelled" ? null : result.error,
      });
  }
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
    update(draft: D) {
      cancel();
      publish({
        draft,
        output: options.empty,
        error: null,
        status: "idle",
        retained:
          options.retain === false || ports.drafts.accepts(options.serialize?.(draft) ?? draft),
      });
      schedule();
    },
    run,
    cancel() {
      cancel();
      publish({ status: "cancelled", error: null });
    },
    reject(error: AppError) {
      cancel();
      publish({ output: options.empty, status: "failed", error });
    },
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
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    activate() {
      if (active) return;
      active = true;
      const restored =
        options.retain === false
          ? state.draft
          : (options.restore?.(ports.drafts.get(id), state.draft) ?? state.draft);
      publish({ draft: restored, status: "idle" });
      schedule();
    },
    dispose() {
      if (!active) return;
      active = false;
      cancel();
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
