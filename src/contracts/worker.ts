/** @file 提供 serveWorker() 协议桥。接收任务消息、调用执行函数，将结果或归一化错误连同任务标识发回。 */
import type { WorkerRequest, WorkerResponse } from "./ports";
import { normalizeError } from "./result";
/** 统一 Worker 协议需要的接收和发送能力，实际线程事件由工具入口适配。 */
type WorkerEndpoint = {
  listen(listener: (data: unknown) => void): void;
  send(message: WorkerResponse): void;
};
/** 将 endpoint 的消息交给 execute 执行，并按统一协议返回结果；由各工具的 Worker 入口调用。 */
export function serveWorker(
  endpoint: WorkerEndpoint,
  execute: (operation: string, input: unknown) => unknown | Promise<unknown>,
) {
  endpoint.listen((data) => {
    if (typeof data !== "object" || data === null || !("taskId" in data) || !("operation" in data))
      return;
    const request = data as WorkerRequest;
    // 响应沿用完整请求标识，主线程据此识别过期或串线的结果。
    const envelope = {
      scope: request.scope,
      taskId: request.taskId,
      toolId: request.toolId,
      operation: request.operation,
      revision: request.revision,
    };
    // 同步算法和异步依赖加载走同一成功/失败通道，异常不会逃出消息回调。
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
          /* 通信通道已不可用时，由任务拥有者处理线程错误或超时并完成清理。 */
        }
      });
  });
}
