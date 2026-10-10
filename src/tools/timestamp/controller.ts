/** @file 管理输入和转换结果；通过注入的时钟提供“使用当前时间”，保留输入草稿。 */
import { createModelController } from "../../contracts/model";
import type { ClockPort, ControllerPorts } from "../../contracts/ports";
import { normalizeError } from "../../contracts/result";
import { convertTimestamp } from "./core";
/** 通过 ports 组装 时间戳转换的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts & { clock: ClockPort }) {
  return createModelController(
    "timestamp",
    { input: "", result: null as ReturnType<typeof convertTimestamp> | null, error: "" },
    (state, set) => ({
      ...state,
      setInput(value: string) {
        set("input", value);
        set("result", null);
        set("error", "");
      },
      /** 转换 value 或当前输入并提交结果，失败时清理旧结果并显示统一校验错误。 */
      convert(value = state.input) {
        try {
          set("result", convertTimestamp(value));
          set("error", "");
        } catch (error) {
          set("result", null);
          set("error", normalizeError(error, "validation").message);
        }
      },
      /** 从注入时钟读取当前毫秒值并立即转换，便于测试且避免算法隐式取得时间。 */
      useNow() {
        const input = ports.clock.now().toString();
        set("input", input);
        set("result", convertTimestamp(input));
        set("error", "");
      },
    }),
    ports,
    ["input"],
  );
}
