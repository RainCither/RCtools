/** 仅在 Worker 中执行匹配和替换；页面通过 terminate 中断高成本表达式。 */
import { evaluateRegex } from "./regex-core";
import type { RegexWorkerRequest, RegexWorkerResponse } from "./regex-runner";

// 单独声明消息接口，避免为整个浏览器项目引入冲突的 webworker 全局类型。
const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<RegexWorkerRequest>) => void) | null;
  postMessage: (response: RegexWorkerResponse) => void;
};
workerScope.onmessage = ({ data }) => {
  const { requestId, pattern, flags, source, replacement, maxMatches } = data;
  try {
    workerScope.postMessage({
      requestId,
      result: evaluateRegex(pattern, flags, source, replacement, maxMatches),
    });
  } catch {
    workerScope.postMessage({ requestId, error: "正则计算失败，请缩短输入后重试。" });
  }
};
