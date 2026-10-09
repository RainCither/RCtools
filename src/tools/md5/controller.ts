import type { FileResource, HashSourceMode } from "../../contracts/files";
import { validateHashFile } from "../../contracts/files";
import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";

type Verify = "idle" | "match" | "mismatch";
type HashResult = { digest: string; matches: boolean | null; error: string };
export function createController(ports: ControllerPorts) {
  return createModelController(
    "md5",
    {
      sourceMode: "text" as HashSourceMode,
      input: "",
      selectedFile: null as FileResource | null,
      digest: "",
      targetDigest: "",
      verification: "idle" as Verify,
      verificationError: "",
      operationError: "",
      busy: false,
    },
    (state, set, run) => {
      const reset = () => {
        set("digest", "");
        set("verification", "idle");
        set("verificationError", "");
        set("operationError", "");
      };
      const process = (operation: "hash" | "verify") => {
        if (state.sourceMode === "file" && !state.selectedFile) {
          set("operationError", "请先选择要计算的文件。");
          return;
        }
        reset();
        const payload = { source: state.input, target: state.targetDigest };
        const file = state.selectedFile;
        run<HashResult>(
          operation,
          payload,
          (result) => {
            set("digest", result.digest);
            set("verificationError", result.error);
            set(
              "verification",
              result.matches === null ? "idle" : result.matches ? "match" : "mismatch",
            );
          },
          state.sourceMode === "file" && file
            ? async (signal) => {
                const bytes = await file.read(signal);
                return { input: { ...payload, source: bytes }, transfer: [bytes] };
              }
            : undefined,
        );
      };
      return {
        ...state,
        selectedFile: state.selectedFile
          ? { name: state.selectedFile.name, size: state.selectedFile.size }
          : null,
        changeSourceMode: (mode: HashSourceMode) => set("sourceMode", mode),
        handleTextChange: (value: string) => set("input", value),
        handleFileChange: (file: FileResource | null) => {
          if (file) {
            const error = validateHashFile(file);
            if (error) {
              set("selectedFile", null);
              set("operationError", error);
              return;
            }
          }
          set("selectedFile", file);
        },
        calculateDigest: () => process("hash"),
        verifyCandidate: () => process("verify"),
        clearAll: () => {
          set("input", "");
          set("selectedFile", null);
          set("targetDigest", "");
          reset();
        },
        setTargetDigest: (value: string) => set("targetDigest", value),
        setVerification: (value: Verify) => set("verification", value),
        setVerificationError: (value: string) => set("verificationError", value),
        setOperationError: (value: string) => set("operationError", value),
      };
    },
    ports,
    ["sourceMode", "input", "targetDigest"],
    { digest: "", verification: "idle", verificationError: "", operationError: "", busy: false },
    ["sourceMode", "input", "targetDigest", "selectedFile"],
  );
}
