import { createModelController } from "../../contracts/model";
import type { ClockPort, ControllerPorts } from "../../contracts/ports";
import { normalizeError } from "../../contracts/result";
import { convertTimestamp } from "./core";
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
      convert(value = state.input) {
        try {
          set("result", convertTimestamp(value));
          set("error", "");
        } catch (error) {
          set("result", null);
          set("error", normalizeError(error, "validation").message);
        }
      },
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
