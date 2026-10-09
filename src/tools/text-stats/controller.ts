import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
import type { countText } from "./core";
export function createController(ports: ControllerPorts) {
  return createOperationController<string, ReturnType<typeof countText>>({
    id: "text-stats",
    initial: "",
    empty: { characters: 0, noSpaces: 0, words: 0, lines: 0 },
    ports,
    restore: (value, initial) => (typeof value === "string" ? value : initial),
    automatic: (input) => ({ operation: "count", input }),
  });
}
