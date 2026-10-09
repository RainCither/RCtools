import { serveWorker } from "../../contracts/worker";
import { md5Bytes, md5Hex, verifyMd5Digest } from "./core";
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
    const data = input as { source: string | ArrayBuffer; target: string };
    const digest =
      typeof data.source === "string"
        ? await md5Hex(data.source)
        : await md5Bytes(new Uint8Array(data.source as ArrayBuffer));
    return operation === "verify"
      ? verifyMd5Digest(data.target, digest)
      : { digest, matches: null, error: "" };
  },
);
