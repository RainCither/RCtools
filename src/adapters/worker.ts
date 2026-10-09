import type { WorkerPort, WorkerRequest } from "../contracts/ports";
/** Keeps DOM Worker types out of the portable executor contract. */
export function adaptWorker(worker: Worker): WorkerPort {
  const port: WorkerPort = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage(message: WorkerRequest, transfer) {
      worker.postMessage(message, transfer ? [...transfer] : []);
    },
    terminate() {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    },
  };
  worker.onmessage = (event) => port.onmessage?.({ data: event.data });
  worker.onerror = (event) => port.onerror?.({ preventDefault: () => event.preventDefault() });
  worker.onmessageerror = () => port.onmessageerror?.();
  return port;
}
