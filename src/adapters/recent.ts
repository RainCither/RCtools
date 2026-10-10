/** @file 管理最近使用工具。校验和去重 ID、最多保留 3 项，通过浏览器存储持久化并同步变化；存储失败时保留内存状态。 */
import type { Logger, RecentStore } from "../contracts/ports";
/** 最近使用持久化所需的最小存储接口，便于在测试中模拟存储不可用。 */
type StoragePort = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
/** 根据有效 ids 管理最近使用，storage 提供持久能力，events 提供跨页面变化通知；返回可订阅存储。 */
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
  /** 复制并冻结最近使用列表，再通知订阅者；新快照引用用于界面订阅比较。 */
  function publish(next: readonly string[]) {
    snapshot = Object.freeze([...next]);
    for (const listener of listeners) listener();
  }
  /** 读取持久化列表并过滤失效 ID、去重和截断，发布最多三项；解析或存储失败时保留当前内存状态。 */
  function read() {
    try {
      const raw = storage().getItem(key);
      if (raw === null) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed))
        // 先过滤有效 ID，再去重并限制数量，兼容旧存储或已移除工具。
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
    /** 注册 listener 并返回退订函数，使组件或事件拥有者能在离开时释放订阅。 */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** 将有效 id 提到最近使用首位并持久化，写入失败时继续使用已发布的内存列表。 */
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
    /** 读取持久最近列表并订阅跨页面变化；重复激活不会重复注册存储监听。 */
    activate() {
      if (unsubscribe) return;
      read();
      unsubscribe = events?.subscribe(read) ?? (() => {});
    },
    /** 解绑跨页面存储监听，保留当前内存列表供下一次激活或界面读取。 */
    dispose() {
      unsubscribe?.();
      unsubscribe = undefined;
    },
  };
}
