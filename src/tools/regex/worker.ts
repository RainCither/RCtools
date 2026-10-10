/** @file 在后台执行正则求值，将无法编译的表达式返回为统一校验错误。 */
import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { evaluateRegex } from "./core";
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
    const data = input as { pattern: string; flags: string; source: string; replacement: string };
    const result = evaluateRegex(data.pattern, data.flags, data.source, data.replacement);
    if (result.status === "error")
      throw failure("validation", "regex.syntax", "正则表达式无效，请检查语法和标志后重试。");
    return result;
  },
);
