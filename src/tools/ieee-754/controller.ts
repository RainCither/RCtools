/** @file 管理精度、数值/位模式输入方式及各自草稿，并设置自动防抖转换。 */
import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
import type { FloatConversionResult, FloatFormat, FloatInputMode } from "./core";
/** 当前工具允许恢复的输入与选项字段，计算结果和运行资源由控制器单独管理。 */
export type Draft = {
  mode: FloatInputMode;
  format: FloatFormat;
  drafts: Record<FloatInputMode, string>;
};
/** 通过 ports 组装 IEEE-754 浮点数转换的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, FloatConversionResult>({
    id: "ieee-754",
    // 数值与位模式分别保存输入，切换模式时不会把十进制文本误当成原始位串。
    initial: { mode: "number", format: "float32", drafts: { number: "", bits: "" } },
    empty: { data: null, error: "" },
    ports,
    /** 校验已有草稿的字段和选项，返回可用输入；结构无效时回退到 initial。 */
    restore(value, initial) {
      if (
        typeof value !== "object" ||
        value === null ||
        !("drafts" in value) ||
        typeof value.drafts !== "object" ||
        value.drafts === null
      )
        return initial;
      const drafts = value.drafts;
      return {
        mode: "mode" in value && value.mode === "bits" ? "bits" : "number",
        format: "format" in value && value.format === "float64" ? "float64" : "float32",
        drafts: {
          number: "number" in drafts && typeof drafts.number === "string" ? drafts.number : "",
          bits: "bits" in drafts && typeof drafts.bits === "string" ? drafts.bits : "",
        },
      };
    },
    /** 读取当前 mode 的独立输入草稿；非空时返回转换任务，空输入返回 null。 */
    automatic: (draft) =>
      draft.drafts[draft.mode]
        ? {
            operation: "convert",
            input: { input: draft.drafts[draft.mode], format: draft.format, mode: draft.mode },
          }
        : null,
  });
}
