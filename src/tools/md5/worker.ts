/** @file 根据来源计算 MD5，在后台返回摘要或与目标摘要的比较结果。 */
import { serveWorker } from "../../contracts/worker";
import { md5Bytes, md5Hex, verifyMd5Digest } from "./core";
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
    const data = input as { source: string | ArrayBuffer; target: string };
    const digest =
      typeof data.source === "string"
        ? await md5Hex(data.source)
        : await md5Bytes(new Uint8Array(data.source as ArrayBuffer));
    return operation === "verify"
      ? verifyMd5Digest(data.target, digest)
      : { digest, matches: null, error: "" };
  },
);
