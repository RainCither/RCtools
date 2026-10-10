/** @file 内存草稿存储。复制输入数据，估算占用，按 16 MiB 默认预算淘汰旧草稿，并拒绝不适合保留的值或被排除的工具。 */
import type { DraftStore } from "../contracts/ports";
/** 估算 value 的可保留数据大小；遇到循环、资源对象或不可序列化值返回无穷大，防止进入草稿。 */
function estimate(value: unknown, visited = new WeakSet<object>()): number {
  if (typeof value === "string") return value.length * 2;
  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  )
    return 8;
  if (
    typeof value !== "object" ||
    (!Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  )
    return Infinity;
  // 只接受可克隆的普通输入结构；循环引用按不可保留处理，避免无限遍历。
  if (visited.has(value)) return Infinity;
  visited.add(value);
  const bytes = Object.entries(value).reduce(
    (sum, [key, entry]) => sum + key.length * 2 + estimate(entry, visited),
    0,
  );
  visited.delete(value);
  return bytes;
}
/** 安全估算 value 的草稿大小，异常对象按不可保留处理，返回用于预算判断的字节估计。 */
function size(value: unknown) {
  try {
    return estimate(value);
  } catch {
    return Infinity;
  }
}
/** 按 budget 建立内存草稿缓存，excluded 指定不保留的工具；返回带预算与复制保护的存储接口。 */
export function createDraftStore(
  budget = 16 * 1024 * 1024,
  excluded: ReadonlySet<string> = new Set(),
): DraftStore {
  const entries = new Map<string, { value: unknown; bytes: number }>();
  let used = 0;
  /** 移除 id 的草稿并同步扣除占用，使覆盖保存和 LRU 淘汰共用准确的预算统计。 */
  function remove(id: string) {
    const entry = entries.get(id);
    if (entry) used -= entry.bytes;
    entries.delete(id);
  }
  return {
    /** 检查 value 是否能放入草稿预算，供页面在离开前显示是否会保留输入。 */
    accepts: (value) => size(value) <= budget,
    /** 读取 id 对应草稿并返回独立副本，同时更新使用顺序，供后续 LRU 淘汰判断。 */
    get(id) {
      const entry = entries.get(id);
      if (!entry) return undefined;
      // 读取时更新使用顺序，让预算淘汰最久未使用的草稿。
      entries.delete(id);
      entries.set(id, entry);
      return structuredClone(entry.value);
    },
    /** 保存 id 对应的 value 副本，按预算淘汰旧草稿；返回本次输入是否可保留。 */
    set(id, value) {
      if (excluded.has(id)) {
        remove(id);
        return true;
      }
      remove(id);
      const bytes = size(value);
      if (bytes > budget) return false;
      let cloned: unknown;
      try {
        cloned = structuredClone(value);
      } catch {
        return false;
      }
      // 在写入前释放最旧草稿，确保总预算始终包含本次新值。
      while (used + bytes > budget) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        remove(oldest);
      }
      entries.set(id, { value: cloned, bytes });
      used += bytes;
      return true;
    },
    delete: remove,
  };
}
