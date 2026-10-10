/** @file 管理文本输入和零值结果，设置输入变化后的自动防抖统计，并保留输入草稿。 */
import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
import type { countText } from "./core";
/** 通过 ports 组装 文本统计的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createOperationController<string, ReturnType<typeof countText>>({
    id: "text-stats",
    initial: "",
    empty: { characters: 0, noSpaces: 0, words: 0, lines: 0 },
    ports,
    /** 校验已有草稿的字段和选项，返回可用输入；结构无效时回退到 initial。 */
    restore: (value, initial) => (typeof value === "string" ? value : initial),
    /** 对每次输入变化返回统计任务，空文本同样计算，以及时恢复四项零值。 */
    automatic: (input) => ({ operation: "count", input }),
  });
}
