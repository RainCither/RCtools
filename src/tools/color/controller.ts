/** @file 管理 HEX 输入，派生规范 HEX、RGB 和 HSL 结果，并保留输入草稿。 */
import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";
import { hexToRgb, normalizeHex, rgbToHsl } from "./core";
/** 通过 ports 组装 颜色转换的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createModelController(
    "color",
    { input: "#F26B4D" },
    (state, set) => {
      const normalized = normalizeHex(state.input);
      const rgb = normalized ? hexToRgb(normalized) : null;
      return {
        input: state.input,
        normalized,
        rgb,
        hsl: rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null,
        setInput(value: string) {
          set("input", value);
        },
      };
    },
    ports,
  );
}
