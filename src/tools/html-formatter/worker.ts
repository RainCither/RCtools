/** @file 校验输入，在后台调用 HTML 格式化或压缩入口。 */
import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { formatHtml, minifyHtml } from "./core";
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
    if (
      typeof input !== "object" ||
      input === null ||
      !("input" in input) ||
      typeof input.input !== "string"
    )
      throw failure("validation", "html-formatter.input", "请输入内容。");
    return operation === "format" ? formatHtml(input.input) : minifyHtml(input.input);
  },
);
