/** @file 管理脚本输入和压缩方式，将两项作为草稿恢复，并管理执行结果与错误。 */
import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
/** 当前工具允许恢复的输入与选项字段，计算结果和运行资源由控制器单独管理。 */
export type Draft = { input: string; mode: "mangle" | "preserve-names" };
/** 通过 ports 组装 JavaScript 格式化压缩的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, string>({
    id: "js-formatter",
    initial: {
      input:
        'const greet=(name)=>{const message=`你好，${name}`;console.log(message)};greet("工具匣");',
      mode: "mangle",
    },
    empty: "",
    ports,
    /** 校验已有草稿的字段和选项，返回可用输入；结构无效时回退到 initial。 */
    restore: (value, initial) =>
      typeof value === "object" &&
      value !== null &&
      "input" in value &&
      typeof value.input === "string"
        ? {
            input: value.input,
            mode: "mode" in value && value.mode === "preserve-names" ? "preserve-names" : "mangle",
          }
        : initial,
  });
}
