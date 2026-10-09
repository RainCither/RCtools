import type { Logger, RecentStore } from "../contracts/ports";
type StoragePort = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
export function createRecentStore(
  ids: ReadonlySet<string>,
  storage: () => StoragePort,
  logger: Logger,
  events?: { subscribe(listener: () => void): () => void },
): RecentStore {
  const key = "toolbox:recent:v1";
  const defaults = ["json", "timestamp", "text-stats"].filter((id) => ids.has(id));
  let snapshot: readonly string[] = defaults;
  const listeners = new Set<() => void>();
  let unsubscribe: (() => void) | undefined;
  function publish(next: readonly string[]) {
    snapshot = Object.freeze([...next]);
    for (const listener of listeners) listener();
  }
  function read() {
    try {
      const raw = storage().getItem(key);
      if (raw === null) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed))
        publish(
          [
            ...new Set(parsed.filter((id): id is string => typeof id === "string" && ids.has(id))),
          ].slice(0, 3),
        );
    } catch {
      logger.emit({ level: "warn", event: "storage.degraded", errorCode: "storage.recent" });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    record(id) {
      if (!ids.has(id)) return;
      const next = [id, ...snapshot.filter((value) => value !== id)].slice(0, 3);
      publish(next);
      try {
        storage().setItem(key, JSON.stringify(next));
      } catch {
        logger.emit({ level: "warn", event: "storage.degraded", errorCode: "storage.recent" });
      }
    },
    activate() {
      if (unsubscribe) return;
      read();
      unsubscribe = events?.subscribe(read) ?? (() => {});
    },
    dispose() {
      unsubscribe?.();
      unsubscribe = undefined;
    },
  };
}
