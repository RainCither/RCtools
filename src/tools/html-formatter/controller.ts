/** @file 管理 HTML 示例、输入草稿、后台结果和错误状态。 */
import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
/** 当前工具允许恢复的输入与选项字段，计算结果和运行资源由控制器单独管理。 */
export type Draft = { input: string };
/** 通过 ports 组装 HTML 格式化压缩的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, string>({
    id: "html-formatter",
    initial: {
      input:
        '<!doctype html><html lang="zh-CN"><head><style>.card{color:#ff0000;padding:12px 12px 12px 12px}</style></head><body><main class="card">工具匣</main><script>const message="页面已加载";console.log(message)</script></body></html>',
    },
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
