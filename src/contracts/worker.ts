import type { WorkerRequest, WorkerResponse } from "./ports";
import { normalizeError } from "./result";
type WorkerEndpoint = {
  listen(listener: (data: unknown) => void): void;
  send(message: WorkerResponse): void;
};
/** Only worker entrypoints call this transport bridge. */
export function serveWorker(
  endpoint: WorkerEndpoint,
  execute: (operation: string, input: unknown) => unknown | Promise<unknown>,
) {
  endpoint.listen((data) => {
    if (typeof data !== "object" || data === null || !("taskId" in data) || !("operation" in data))
      return;
    const request = data as WorkerRequest;
    const envelope = {
      scope: request.scope,
      taskId: request.taskId,
      toolId: request.toolId,
      operation: request.operation,
      revision: request.revision,
    };
    void Promise.resolve()
      .then(() => execute(request.operation, request.input))
      .then(
        (value) => endpoint.send({ ...envelope, result: { ok: true, value } }),
        (error) =>
          endpoint.send({ ...envelope, result: { ok: false, error: normalizeError(error) } }),
      )
      .catch(() => {
        try {
          endpoint.send({
            ...envelope,
            result: {
              ok: false,
              error: {
                kind: "execution",
                code: "worker.serialization",
                message: "计算结果无法传输，请重新执行。",
              },
            },
          });
        } catch {
          /* The owner handles an unavailable worker or its deadline. */
        }
      });
  });
}
