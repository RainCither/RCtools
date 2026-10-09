import { validateHashFile } from "../contracts/files";
import type { CancellationSignal } from "../contracts/ports";
import { failure } from "../contracts/result";
export function readFileBytes(file: File, signal: CancellationSignal): Promise<ArrayBuffer> {
  if (typeof FileReader === "undefined")
    return Promise.reject(
      failure(
        "unsupported",
        "file.unavailable",
        "浏览器不支持可取消的文件读取，请使用现代浏览器。",
      ),
    );
  const invalid = validateHashFile(file);
  if (invalid) return Promise.reject(failure("validation", "file.size", invalid));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let unsubscribe = () => {};
    const cleanup = () => {
      unsubscribe();
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    function cancel() {
      cleanup();
      reader.abort();
      reject(failure("cancelled", "file.cancelled", "已取消。"));
    }
    reader.onload = () => {
      const result = reader.result;
      cleanup();
      if (result instanceof ArrayBuffer) resolve(result);
      else reject(failure("execution", "file.read", "文件读取失败，请重新选择。"));
    };
    reader.onerror = () => {
      cleanup();
      reject(failure("execution", "file.read", "文件读取失败，请重新选择。"));
    };
    reader.onabort = cancel;
    if (signal.aborted) {
      cancel();
      return;
    }
    unsubscribe = signal.onCancel(cancel);
    reader.readAsArrayBuffer(file);
  });
}
