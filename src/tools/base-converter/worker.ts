import { serveWorker } from "../../contracts/worker";
import { convertBaseInteger } from "./core";
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
    const data = input as { input: string; base: import("./core").CommonBase };
    return convertBaseInteger(data.input, data.base);
  },
);
