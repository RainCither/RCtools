/** @file 在后台调用文本统计函数并返回统计数据。 */
import { serveWorker } from "../../contracts/worker";
import { countText } from "./core";
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
  (_operation, input) => countText(typeof input === "string" ? input : ""),
);
