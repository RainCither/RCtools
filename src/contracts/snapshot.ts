/** Snapshots contain immutable display data; resources stay behind capability ports. */
export function freezeSnapshot<T>(value: T, visited = new WeakSet<object>()): Readonly<T> {
  if (typeof value !== "object" || value === null || visited.has(value)) return value;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
  visited.add(value);
  for (const child of Object.values(value)) freezeSnapshot(child, visited);
  return Object.freeze(value);
}
