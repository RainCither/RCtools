/** @file 校验任务输入，将格式化或压缩动作交给 CSS 核心算法。 */
import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { formatCss, minifyCss } from "./core";
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
      throw failure("validation", "css-formatter.input", "请输入内容。");
    return operation === "format" ? formatCss(input.input) : minifyCss(input.input);
  },
);
