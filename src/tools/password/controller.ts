/** @file 管理长度、字符类别、结果和错误；通过随机能力生成密码，离开时不保留规则和结果。 */
import { createModelController } from "../../contracts/model";
import type { ControllerPorts, RandomPort } from "../../contracts/ports";
import { normalizeError } from "../../contracts/result";
import { generatePassword } from "./core";
/** 通过 ports 组装 密码生成的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts & { random: RandomPort }) {
  return createModelController(
    "password",
    {
      length: 18,
      options: { lower: true, upper: true, number: true, symbol: false },
      password: "",
      error: "",
    },
    (state, set) => ({
      ...state,
      setLength(value: number) {
        set("length", value);
        set("password", "");
      },
      setOptions(
        value: typeof state.options | ((current: typeof state.options) => typeof state.options),
      ) {
        set("options", value);
        set("password", "");
      },
      /** 校验当前输入与选项后生成结果，将失败转换为用户可见状态。 */
      generate() {
        try {
          set("password", generatePassword(state.length, state.options, ports.random));
          set("error", "");
        } catch (error) {
          set("password", "");
          set("error", normalizeError(error, "validation").message);
        }
      },
    }),
    ports,
    // 空白保留清单使规则和密码都随实例释放，避免返回工具时恢复敏感结果。
    [],
  );
}
