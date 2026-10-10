/** @file 将浏览器原生 Worker 包装为项目约定的 WorkerPort，统一消息、错误和终止处理。 */
import type { WorkerPort, WorkerRequest } from "../contracts/ports";
/** 将原生 worker 转为 WorkerPort，统一消息与释放行为，使任务执行器只依赖能力接口。 */
export function adaptWorker(worker: Worker): WorkerPort {
  const port: WorkerPort = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    /** 发送任务 message，并按 transfer 移交缓冲区所有权，避免文件字节在跨线程传输时重复复制。 */
    postMessage(message: WorkerRequest, transfer) {
      worker.postMessage(message, transfer ? [...transfer] : []);
    },
    /** 解除消息与错误回调后终止 Worker，使离开的任务不再向原页面发送结果。 */
    terminate() {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    },
  };
  worker.onmessage = (event) => port.onmessage?.({ data: event.data });
  worker.onerror = (event) => port.onerror?.({ preventDefault: () => event.preventDefault() });
  worker.onmessageerror = () => port.onmessageerror?.();
  return port;
}
