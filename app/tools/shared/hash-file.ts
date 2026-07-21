export const MAX_HASH_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_HASH_FILE_LABEL = "20 MiB";

export type HashSourceMode = "text" | "file";

export function validateHashFile(file: Pick<File, "size">) {
  return file.size > MAX_HASH_FILE_BYTES
    ? `文件不能超过 ${MAX_HASH_FILE_LABEL}。`
    : "";
}

export function formatHashFileSize(size: number) {
  if (size < 1024) return `${size} B`;

  const unitSize = size < 1024 * 1024 ? 1024 : 1024 * 1024;
  const unit = unitSize === 1024 ? "KiB" : "MiB";
  const value = size / unitSize;
  return `${Number.parseFloat(value.toFixed(2))} ${unit}`;
}

export async function readHashFileBytes(file: File) {
  const validationError = validateHashFile(file);
  if (validationError) throw new Error(validationError);

  try {
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new Error("文件读取失败，请重新选择后再试。");
  }
}
