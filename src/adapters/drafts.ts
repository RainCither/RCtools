import type { DraftStore } from "../contracts/ports";
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
  if (visited.has(value)) return Infinity;
  visited.add(value);
  const bytes = Object.entries(value).reduce(
    (sum, [key, entry]) => sum + key.length * 2 + estimate(entry, visited),
    0,
  );
  visited.delete(value);
  return bytes;
}
function size(value: unknown) {
  try {
    return estimate(value);
  } catch {
    return Infinity;
  }
}
export function createDraftStore(
  budget = 16 * 1024 * 1024,
  excluded: ReadonlySet<string> = new Set(),
): DraftStore {
  const entries = new Map<string, { value: unknown; bytes: number }>();
  let used = 0;
  function remove(id: string) {
    const entry = entries.get(id);
    if (entry) used -= entry.bytes;
    entries.delete(id);
  }
  return {
    accepts: (value) => size(value) <= budget,
    get(id) {
      const entry = entries.get(id);
      if (!entry) return undefined;
      entries.delete(id);
      entries.set(id, entry);
      return structuredClone(entry.value);
    },
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
