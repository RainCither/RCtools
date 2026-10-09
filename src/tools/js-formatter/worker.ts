import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { formatJavaScript, minifyJavaScript } from "./core";
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
      throw failure("validation", "js-formatter.input", "请输入内容。");
    return operation === "format"
      ? formatJavaScript(input.input)
      : minifyJavaScript(
          input.input,
          "mode" in input && input.mode === "preserve-names" ? "preserve-names" : "mangle",
        );
  },
);
