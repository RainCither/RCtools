import { serveWorker } from "../../contracts/worker";
import { shaBytes, shaHex, verifyShaDigest } from "./core";
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
      source: string | ArrayBuffer;
      target: string;
      algorithm: import("./core").ShaAlgorithm;
    };
    const digest =
      typeof data.source === "string"
        ? await shaHex(data.source, data.algorithm)
        : await shaBytes(new Uint8Array(data.source as ArrayBuffer), data.algorithm);
    return operation === "verify"
      ? verifyShaDigest(data.target, digest, data.algorithm)
      : { digest, matches: null, error: "", algorithm: data.algorithm };
  },
);
