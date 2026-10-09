import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
export type Draft = { input: string; mode: "mangle" | "preserve-names" };
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, string>({
    id: "js-formatter",
    initial: {
      input:
        'const greet=(name)=>{const message=`你好，${name}`;console.log(message)};greet("工具匣");',
      mode: "mangle",
    },
    empty: "",
    ports,
    restore: (value, initial) =>
      typeof value === "object" &&
      value !== null &&
      "input" in value &&
      typeof value.input === "string"
        ? {
            input: value.input,
            mode: "mode" in value && value.mode === "preserve-names" ? "preserve-names" : "mangle",
          }
        : initial,
  });
}
