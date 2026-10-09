import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { decodeBase64, encodeBase64 } from "./core";
serveWorker(
  {
    listen(listener) {
      self.onmessage = (event) => listener(event.data);
    },
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
