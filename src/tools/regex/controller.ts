import { createOperationController } from "../../contracts/controller";
import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";
import type { RegexEvaluation, RegexFlagState } from "./core";
import { DEFAULT_REGEX_FLAGS, REGEX_FLAGS } from "./core";
import type { CommonRegexEntry, RegexView } from "./regex-reference";
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
      clearAll() {
        set("pattern", "");
        set("source", "");
        set("replacement", "");
        set("flags", { ...DEFAULT_REGEX_FLAGS });
      },
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
export type EvaluationInput = {
  pattern: string;
  flags: string;
  source: string;
  replacement: string;
};
export type ClientEvaluation =
  | RegexEvaluation
  | { status: "running" }
  | { status: "cancelled" }
  | { status: "timeout" | "unavailable"; error: string };
export function createEvaluationController(ports: ControllerPorts) {
  return createOperationController<EvaluationInput, RegexEvaluation>({
    id: "regex",
    initial: { pattern: "", flags: "", source: "", replacement: "" },
    empty: { status: "idle", matches: [], truncated: false },
    ports,
    retain: false,
    debounceMs: 200,
    timeoutMs: 2_000,
    automatic: (input) => (input.pattern ? { operation: "evaluate", input } : null),
  });
}
