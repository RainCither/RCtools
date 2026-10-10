/** @file 管理标签页、表达式、标志、测试文本和替换内容；另建计算控制器，设置 200 ms 防抖和 2 秒超时。 */
import { createOperationController } from "../../contracts/controller";
import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";
import type { RegexEvaluation, RegexFlagState } from "./core";
import { DEFAULT_REGEX_FLAGS, REGEX_FLAGS } from "./core";
import type { CommonRegexEntry, RegexView } from "./regex-reference";
/** 通过 ports 组装 正则表达式测试的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createModelController(
    "regex",
    {
      view: "tester" as RegexView,
      pattern: "",
      source: "",
      replacement: "",
      flags: { ...DEFAULT_REGEX_FLAGS },
    },
    (state, set) => ({
      ...state,
      setView: (value: RegexView) => set("view", value),
      setPattern: (value: string) => set("pattern", value),
      setSource: (value: string) => set("source", value),
      setReplacement: (value: string) => set("replacement", value),
      setFlags: (value: RegexFlagState | ((current: RegexFlagState) => RegexFlagState)) =>
        set("flags", value),
      /** 清空当前工具的输入、结果和相关资源，避免保留已明确要求遗忘的数据。 */
      clearAll() {
        set("pattern", "");
        set("source", "");
        set("replacement", "");
        set("flags", { ...DEFAULT_REGEX_FLAGS });
      },
      /** 把 entry 的表达式、标志和正例载入测试器，清除旧替换输入并切换到测试页面。 */
      loadCommonRegex(entry: CommonRegexEntry) {
        const flags = { ...DEFAULT_REGEX_FLAGS };
        for (const flag of REGEX_FLAGS) flags[flag] = entry.flags.includes(flag);
        set("pattern", entry.pattern);
        set("flags", flags);
        set("source", entry.positiveExample);
        set("replacement", "");
        set("view", "tester");
      },
    }),
    ports,
  );
}
/** 一次正则求值的完整输入，任何字段变化都会让旧结果失效。 */
export type EvaluationInput = {
  pattern: string;
  flags: string;
  source: string;
  replacement: string;
};
/** 正则页面展示状态，将 Worker 结果与运行、取消、超时和能力不足统一表达。 */
export type ClientEvaluation =
  | RegexEvaluation
  | { status: "running" }
  | { status: "cancelled" }
  | { status: "timeout" | "unavailable"; error: string };
/** 建立正则专用自动计算控制器，使用 200 ms 防抖和 2 秒超时，返回可取消的求值状态。 */
export function createEvaluationController(ports: ControllerPorts) {
  return createOperationController<EvaluationInput, RegexEvaluation>({
    id: "regex",
    initial: { pattern: "", flags: "", source: "", replacement: "" },
    empty: { status: "idle", matches: [], truncated: false },
    ports,
    // 表单控制器已保存输入；计算控制器只管理派生任务，避免覆盖同 ID 的表单草稿。
    retain: false,
    debounceMs: 200,
    timeoutMs: 2_000,
    /** 表达式非空时返回求值任务；pattern 为空时返回 null，测试文本可以为空。 */
    automatic: (input) => (input.pattern ? { operation: "evaluate", input } : null),
  });
}
