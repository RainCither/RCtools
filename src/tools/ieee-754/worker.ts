/** @file 在后台按输入方式和精度执行数值编码或位模式解码。 */
import { serveWorker } from "../../contracts/worker";
import { convertFloatInput } from "./core";
serveWorker(
  {
    /** 把后台线程的消息交给 listener，由统一 Worker 协议继续校验并分派任务。 */
    listen(listener) {
      self.onmessage = (event) => listener(event.data);
    },
    /** 将统一协议生成的 message 返回主线程，保留任务与输入版本标识。 */
    send(message) {
      self.postMessage(message);
    },
  },
  async (operation, input) => {
    const data = input as {
      input: string;
      format: import("./core").FloatFormat;
      mode: import("./core").FloatInputMode;
    };
    return convertFloatInput(data.input, data.format, data.mode);
  },
);
