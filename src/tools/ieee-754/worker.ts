import { serveWorker } from "../../contracts/worker";
import { convertFloatInput } from "./core";
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
    const data = input as {
      input: string;
      format: import("./core").FloatFormat;
      mode: import("./core").FloatInputMode;
    };
    return convertFloatInput(data.input, data.format, data.mode);
  },
);
