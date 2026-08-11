/** @file 集中处理哈希工具共用的文件大小限制、显示与读取逻辑。 */
/** 浏览器端单次哈希允许读取的最大文件字节数。 */
export const MAX_HASH_FILE_BYTES = 20 * 1024 * 1024;
/** 与字节上限一致的用户界面文案。 */
export const MAX_HASH_FILE_LABEL = "20 MiB";

/** 哈希工具可选择文本或文件作为摘要来源。 */
export type HashSourceMode = "text" | "file";

/** 检查文件是否超过浏览器端哈希允许的大小。 */
export function validateHashFile(file: Pick<File, "size">) {
  return file.size > MAX_HASH_FILE_BYTES
    ? `文件不能超过 ${MAX_HASH_FILE_LABEL}。`
    : "";
}

/** 使用二进制单位生成适合界面展示的文件大小。 */
export function formatHashFileSize(size: number) {
  if (size < 1024) return `${size} B`;

  const unitSize = size < 1024 * 1024 ? 1024 : 1024 * 1024;
  const unit = unitSize === 1024 ? "KiB" : "MiB";
  const value = size / unitSize;
  return `${Number.parseFloat(value.toFixed(2))} ${unit}`;
}

/** 校验并读取文件字节；将底层读取失败转换为稳定提示。 */
export async function readHashFileBytes(file: File) {
  const validationError = validateHashFile(file);
  if (validationError) throw new Error(validationError);

  try {
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new Error("文件读取失败，请重新选择后再试。");
  }
}
