import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";
import { hexToRgb, normalizeHex, rgbToHsl } from "./core";
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
