import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
import type { FloatConversionResult, FloatFormat, FloatInputMode } from "./core";
export type Draft = {
  mode: FloatInputMode;
  format: FloatFormat;
  drafts: Record<FloatInputMode, string>;
};
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, FloatConversionResult>({
    id: "ieee-754",
    initial: { mode: "number", format: "float32", drafts: { number: "", bits: "" } },
    empty: { data: null, error: "" },
    ports,
    restore(value, initial) {
      if (
        typeof value !== "object" ||
        value === null ||
        !("drafts" in value) ||
        typeof value.drafts !== "object" ||
        value.drafts === null
      )
        return initial;
      const drafts = value.drafts;
      return {
        mode: "mode" in value && value.mode === "bits" ? "bits" : "number",
        format: "format" in value && value.format === "float64" ? "float64" : "float32",
        drafts: {
          number: "number" in drafts && typeof drafts.number === "string" ? drafts.number : "",
          bits: "bits" in drafts && typeof drafts.bits === "string" ? drafts.bits : "",
        },
      };
    },
    automatic: (draft) =>
      draft.drafts[draft.mode]
        ? {
            operation: "convert",
            input: { input: draft.drafts[draft.mode], format: draft.format, mode: draft.mode },
          }
        : null,
  });
}
