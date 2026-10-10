/** @file 管理 JSON 输入草稿、初始示例、任务结果和错误，恢复之前的输入。 */
import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
/** 当前工具允许恢复的输入与选项字段，计算结果和运行资源由控制器单独管理。 */
export type Draft = { input: string };
/** 通过 ports 组装 JSON 格式化的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, string>({
    id: "json",
    initial: { input: '{\n  "name": "工具匣",\n  "ready": true\n}' },
    empty: "",
    ports,
    /** 校验已有草稿的字段和选项，返回可用输入；结构无效时回退到 initial。 */
    restore: (value, initial) =>
      typeof value === "object" &&
      value !== null &&
      "input" in value &&
      typeof value.input === "string"
        ? { input: value.input }
        : initial,
  });
}
