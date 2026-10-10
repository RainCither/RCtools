/** @file 管理输入和来源进制，校验恢复的草稿，并设置输入变化后的自动防抖转换。 */
import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
import type { CommonBase, convertBaseInteger } from "./core";
/** 当前工具允许恢复的输入与选项字段，计算结果和运行资源由控制器单独管理。 */
export type Draft = { input: string; base: CommonBase };
/** 通过 ports 组装 进制转换的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, ReturnType<typeof convertBaseInteger>>({
    id: "base-converter",
    initial: { input: "", base: 10 },
    empty: { value: null, outputs: null, error: "" },
    ports,
    /** 校验已有草稿的字段和选项，返回可用输入；结构无效时回退到 initial。 */
    restore(value, initial) {
      if (
        typeof value !== "object" ||
        value === null ||
        !("input" in value) ||
        typeof value.input !== "string"
      )
        return initial;
      const base =
        "base" in value && (value.base === 2 || value.base === 8 || value.base === 16)
          ? value.base
          : 10;
      return { input: value.input, base };
    },
    /** 输入非空时返回转换任务及来源进制，空输入返回 null 以保持空结果。 */
    automatic: (draft) => (draft.input ? { operation: "convert", input: draft } : null),
  });
}
