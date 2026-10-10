/** @file 管理输入草稿、输出和任务状态，为编码和解码共用单操作控制器。 */
import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
/** 通过 ports 组装 Base64 编解码的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createOperationController({
    id: "base64",
    initial: "",
    empty: "",
    ports,
    /** 校验已有草稿的字段和选项，返回可用输入；结构无效时回退到 initial。 */
    restore: (value, initial) => (typeof value === "string" ? value : initial),
  });
}
