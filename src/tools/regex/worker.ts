import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { evaluateRegex } from "./core";
serveWorker(
  {
    listen(listener) {
      self.onmessage = (event) => listener(event.data);
    },
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
