import { createModelController } from "../../contracts/model";
import type { ControllerPorts, RandomPort } from "../../contracts/ports";
import { normalizeError } from "../../contracts/result";
import { generatePassword } from "./core";
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
    [],
  );
}
