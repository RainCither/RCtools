/** @file 在后台执行 JSON 格式化或压缩，并将解析异常转为带位置的统一错误。 */
import { parserFailure } from "../../contracts/parsing";
import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { formatJson, minifyJson } from "./core";
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
      throw failure("validation", "json.input", "请输入内容。");
    try {
      return operation === "format" ? formatJson(input.input) : minifyJson(input.input);
    } catch (error) {
      throw parserFailure(error, "json", input.input);
    }
  },
);
