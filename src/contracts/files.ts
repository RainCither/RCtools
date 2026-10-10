/** @file 定义文件资源接口、文本/文件来源类型、20 MiB 哈希文件上限，以及文件大小校验和显示格式。 */
export const MAX_HASH_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_HASH_FILE_LABEL = "20 MiB";
/** 摘要输入来源类型，区分文字与文件的校验和读取流程。 */
export type HashSourceMode = "text" | "file";
/** 文件展示信息与可取消字节读取的组合，避免控制器快照暴露浏览器文件对象。 */
export type FileResource = Readonly<{
  name: string;
  size: number;
  read(signal: import("./ports").CancellationSignal): Promise<ArrayBuffer>;
}>;
/** 按 file.size 校验哈希文件上限，返回空字符串或用户可见的大小错误。 */
export function validateHashFile(file: { size: number }) {
  return file.size > MAX_HASH_FILE_BYTES ? `文件不能超过 ${MAX_HASH_FILE_LABEL}。` : "";
}
/** 将 size 字节数转换为 B、KiB 或 MiB 显示文字，供文件摘要工具共用。 */
export function formatHashFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  const unitSize = size < 1024 * 1024 ? 1024 : 1024 * 1024;
  return `${Number.parseFloat((size / unitSize).toFixed(2))} ${unitSize === 1024 ? "KiB" : "MiB"}`;
}
