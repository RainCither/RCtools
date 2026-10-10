/** @file 按 SHA 算法处理文本或原始字节，在后台返回摘要及可选匹配结果。 */
import { serveWorker } from "../../contracts/worker";
import { shaBytes, shaHex, verifyShaDigest } from "./core";
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
      source: string | ArrayBuffer;
      target: string;
      algorithm: import("./core").ShaAlgorithm;
    };
    const digest =
      typeof data.source === "string"
        ? await shaHex(data.source, data.algorithm)
        : await shaBytes(new Uint8Array(data.source as ArrayBuffer), data.algorithm);
    return operation === "verify"
      ? verifyShaDigest(data.target, digest, data.algorithm)
      : { digest, matches: null, error: "", algorithm: data.algorithm };
  },
);
