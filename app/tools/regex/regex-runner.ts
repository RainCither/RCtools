/** 管理正则 Worker 的防抖、超时、取消和过期响应，不在页面线程执行正则。 */
import type { RegexEvaluation } from "./regex-core";

export const REGEX_DEBOUNCE_MS = 200;
export const REGEX_TIMEOUT_MS = 2_000;

export type RegexInput = {
  pattern: string;
  flags: string;
  source: string;
  replacement: string;
  maxMatches?: number;
};
export type RegexWorkerRequest = RegexInput & { requestId: number };
export type RegexWorkerResponse =
  | { requestId: number; result: RegexEvaluation }
  | { requestId: number; error: string };
export type RegexClientEvaluation = RegexEvaluation
  | { status: "running" }
  | { status: "timeout" | "unavailable"; error: string };
export type RegexWorker = Pick<
  Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror"
>;

/** 每项任务使用独立 Worker，结束或取消后立即释放。工厂可替换以测试生命周期。 */
export function createRegexRunner(
  createWorker: () => RegexWorker,
  onUpdate: (input: RegexInput, result: RegexClientEvaluation) => void,
  options: { debounceMs?: number; timeoutMs?: number } = {},
) {
  let requestId = 0;
  let worker: RegexWorker | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    clearTimeout(debounceTimer);
    clearTimeout(timeoutTimer);
    debounceTimer = undefined;
    timeoutTimer = undefined;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      worker = null;
    }
  }

  function cancel() {
    requestId += 1;
    stop();
  }

  function submit(input: RegexInput) {
    cancel();
    const currentId = requestId;
    if (!input.pattern) {
      onUpdate(input, { status: "idle", matches: [], truncated: false });
      return;
    }
    onUpdate(input, { status: "running" });
    let settled = false;
    function complete(result: RegexClientEvaluation) {
      if (currentId !== requestId || settled) return;
      settled = true;
      stop();
      onUpdate(input, result);
    }
    function fail() {
      complete({
        status: "unavailable",
        error: "正则计算无法启动或执行失败，请检查浏览器支持与网络连接后重新输入。",
      });
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      try {
        worker = createWorker();
        worker.onmessage = (event: MessageEvent<RegexWorkerResponse>) => {
          const response = event.data;
          if (response.requestId !== currentId) return;
          if ("result" in response) complete(response.result);
          else complete({ status: "unavailable", error: response.error });
        };
        worker.onerror = (event) => {
          event.preventDefault();
          fail();
        };
        worker.onmessageerror = fail;
        timeoutTimer = setTimeout(() => complete({
          status: "timeout",
          error: "正则计算超过 2 秒，已停止。请简化表达式或缩短测试文本后重试。",
        }), options.timeoutMs ?? REGEX_TIMEOUT_MS);
        worker.postMessage({ ...input, requestId: currentId });
      } catch {
        fail();
      }
    }, options.debounceMs ?? REGEX_DEBOUNCE_MS);
  }

  return { submit, cancel };
}
