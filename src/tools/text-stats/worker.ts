import { serveWorker } from "../../contracts/worker";
import { countText } from "./core";
serveWorker(
  {
    listen(listener) {
      self.onmessage = (event) => listener(event.data);
    },
    send(message) {
      self.postMessage(message);
    },
  },
  (_operation, input) => countText(typeof input === "string" ? input : ""),
);
