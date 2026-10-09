import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
export type Draft = { input: string };
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, string>({
    id: "css-formatter",
    initial: {
      input: ".card{color:#ff0000;padding:12px 12px 12px 12px}.card:hover{color:rgb(0,128,0)}",
    },
    empty: "",
    ports,
    restore: (value, initial) =>
      typeof value === "object" &&
      value !== null &&
      "input" in value &&
      typeof value.input === "string"
        ? { input: value.input }
        : initial,
  });
}
