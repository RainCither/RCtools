import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
export function createController(ports: ControllerPorts) {
  return createOperationController({
    id: "base64",
    initial: "",
    empty: "",
    ports,
    restore: (value, initial) => (typeof value === "string" ? value : initial),
  });
}
