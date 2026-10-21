/** @file 提供独立 JSON 存档：按需访问浏览器存储，复制数据，持久化失败时保留页面内缓存。 */
import type { Logger, PersistentStore } from "../contracts/ports";
import { failure } from "../contracts/result";

/** 适配器所需的最小字符串存储接口，便于模拟访问限制和配额不足。 */
type StoragePort = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** 用 storage 提供持久能力；缓存 JSON 字符串，避免控制器修改已保存的数据。 */
export function createPersistentStore(storage: () => StoragePort, logger: Logger): PersistentStore {
  const memory = new Map<string, string>();
  const degraded = new Set<string>();
  /** 每个存档在连续降级期间只记录一次诊断，不记录键名、数据或浏览器异常。 */
  function unavailable(key: string) {
    if (!degraded.has(key)) {
      degraded.add(key);
      logger.emit({ level: "warn", event: "storage.degraded", errorCode: "storage.persistent" });
    }
    return {
      ok: false as const,
      error: failure(
        "storage",
        "storage.persistent",
        "浏览器暂时无法保存进度，当前仅在本页面保留，刷新或关闭后可能丢失。",
      ),
    };
  }
  return {
    /** 页面内优先读取自己的最后一次存档，使持久化失败后的站内导航也能恢复。 */
    read(key) {
      try {
        const raw = memory.get(key) ?? storage().getItem(key);
        const value: unknown = raw === null ? null : JSON.parse(raw);
        if (raw !== null) memory.set(key, raw);
        return { ok: true, value };
      } catch {
        return unavailable(key);
      }
    },
    /** 先保存页面内副本，再写入浏览器；后续写入成功时允许解除降级提示。 */
    write(key, value) {
      try {
        const raw = JSON.stringify(value);
        if (raw === undefined) return unavailable(key);
        memory.set(key, raw);
        storage().setItem(key, raw);
        degraded.delete(key);
        return { ok: true, value: undefined };
      } catch {
        return unavailable(key);
      }
    },
  };
}
