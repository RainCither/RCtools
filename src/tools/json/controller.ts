import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
export type Draft = { input: string };
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, string>({
    id: "json",
    initial: { input: '{\n  "name": "工具匣",\n  "ready": true\n}' },
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
