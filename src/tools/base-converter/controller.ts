import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
import type { CommonBase, convertBaseInteger } from "./core";
export type Draft = { input: string; base: CommonBase };
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, ReturnType<typeof convertBaseInteger>>({
    id: "base-converter",
    initial: { input: "", base: 10 },
    empty: { value: null, outputs: null, error: "" },
    ports,
    restore(value, initial) {
      if (
        typeof value !== "object" ||
        value === null ||
        !("input" in value) ||
        typeof value.input !== "string"
      )
        return initial;
      const base =
        "base" in value && (value.base === 2 || value.base === 8 || value.base === 16)
          ? value.base
          : 10;
      return { input: value.input, base };
    },
    automatic: (draft) => (draft.input ? { operation: "convert", input: draft } : null),
  });
}
