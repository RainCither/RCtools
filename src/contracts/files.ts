export const MAX_HASH_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_HASH_FILE_LABEL = "20 MiB";
export type HashSourceMode = "text" | "file";
export type FileResource = Readonly<{
  name: string;
  size: number;
  read(signal: import("./ports").CancellationSignal): Promise<ArrayBuffer>;
}>;
export function validateHashFile(file: { size: number }) {
  return file.size > MAX_HASH_FILE_BYTES ? `文件不能超过 ${MAX_HASH_FILE_LABEL}。` : "";
}
export function formatHashFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  const unitSize = size < 1024 * 1024 ? 1024 : 1024 * 1024;
  return `${Number.parseFloat((size / unitSize).toFixed(2))} ${unitSize === 1024 ? "KiB" : "MiB"}`;
}
