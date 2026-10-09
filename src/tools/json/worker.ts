import { parserFailure } from "../../contracts/parsing";
import { failure } from "../../contracts/result";
import { serveWorker } from "../../contracts/worker";
import { formatJson, minifyJson } from "./core";
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
      throw failure("validation", "json.input", "请输入内容。");
    try {
      return operation === "format" ? formatJson(input.input) : minifyJson(input.input);
    } catch (error) {
      throw parserFailure(error, "json", input.input);
    }
  },
);
