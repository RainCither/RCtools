/** @file 递归冻结展示快照，防止页面修改控制器状态；对数组缓冲区和字节视图保留相应处理。 */
/** 递归冻结 value 中的展示数据并返回只读快照；visited 防止循环遍历，缓冲区保持原有字节视图。 */
export function freezeSnapshot<T>(value: T, visited = new WeakSet<object>()): Readonly<T> {
  if (typeof value !== "object" || value === null || visited.has(value)) return value;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return value;
  visited.add(value);
  for (const child of Object.values(value)) freezeSnapshot(child, visited);
  return Object.freeze(value);
}
