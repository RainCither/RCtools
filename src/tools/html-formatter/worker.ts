import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { formatHtml, minifyHtml } from "./core";
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
