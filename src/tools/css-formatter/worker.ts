import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { formatCss, minifyCss } from "./core";
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
      throw failure("validation", "css-formatter.input", "请输入内容。");
    return operation === "format" ? formatCss(input.input) : minifyCss(input.input);
  },
);
