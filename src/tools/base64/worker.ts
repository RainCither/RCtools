/** @file 校验输入类型，分派编码或解码动作，并返回无效 Base64 的校验提示。 */
import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { decodeBase64, encodeBase64 } from "./core";
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
  (operation, input) => {
    if (typeof input !== "string") throw failure("validation", "base64.input", "请输入文本。");
    try {
      return operation === "encode" ? encodeBase64(input) : decodeBase64(input);
    } catch {
      throw failure("validation", "base64.invalid", "内容不是有效的 Base64 文本。");
    }
  },
);
