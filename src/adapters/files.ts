/** @file 使用 FileReader 可取消地读取文件字节；检查大小和浏览器支持，并在完成、失败或取消时释放监听。 */
import { validateHashFile } from "../contracts/files";
import type { CancellationSignal } from "../contracts/ports";
import { failure } from "../contracts/result";
/** 在 signal 可取消的范围内读取 file，成功返回 ArrayBuffer；读取结束或失败时移除监听。 */
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
    /** 解绑取消订阅与读取回调，让成功、失败和主动取消共用同一资源释放路径。 */
    const cleanup = () => {
      unsubscribe();
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    /** 解绑读取回调并中止 FileReader，以取消错误结束本次读取，交由任务拥有者清理。 */
    function cancel() {
      // 先解除 onabort 再主动中止，避免取消处理递归触发自身。
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
    // 任务可能在订阅读取前已被取消，此时立即释放而不开始读文件。
    if (signal.aborted) {
      cancel();
      return;
    }
    unsubscribe = signal.onCancel(cancel);
    reader.readAsArrayBuffer(file);
  });
}
