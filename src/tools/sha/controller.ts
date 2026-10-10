/** @file 管理算法、文本/文件来源、计算和校验状态；组织文件读取任务，算法变化时更新对应结果与输入状态。 */
import type { FileResource, HashSourceMode } from "../../contracts/files";
import { validateHashFile } from "../../contracts/files";
import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";
import type { ShaAlgorithm } from "./definitions";
/** 摘要匹配的展示状态，区分尚未比较、匹配和不匹配。 */
type Verify = "idle" | "match" | "mismatch";
/** 后台摘要计算和比较的可序列化结果，包含摘要、可空匹配状态及校验提示。 */
type HashResult = { digest: string; matches: boolean | null; error: string };
/** 通过 ports 组装 SHA-1 / SHA-2 哈希与校验的输入、动作和结果，返回可订阅控制器并按工具策略保留草稿。 */
export function createController(ports: ControllerPorts) {
  return createModelController(
    "sha",
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
      algorithm: "SHA-256" as ShaAlgorithm,
      digestAlgorithm: "SHA-256" as ShaAlgorithm,
    },
    (state, set, run) => {
      /** 清空摘要、匹配状态和操作错误，保留当前算法、输入、文件选择及目标摘要。 */
      const reset = () => {
        set("digest", "");
        set("verification", "idle");
        set("verificationError", "");
        set("operationError", "");
      };
      /** 按 operation 固定文本或文件来源，提交摘要计算或校验任务并更新当前结果。 */
      const process = (operation: "hash" | "verify") => {
        if (state.sourceMode === "file" && !state.selectedFile) {
          set("operationError", "请先选择要计算的文件。");
          return;
        }
        reset();
        const payload = {
          source: state.input,
          target: state.targetDigest,
          algorithm: state.algorithm,
        };
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
            set("digestAlgorithm", state.algorithm);
          },
          state.sourceMode === "file" && file
            ? async (signal) => {
                const bytes = await file.read(signal);
                // 字节转移避免复制文件内容；算法选择与本次输入快照一起发送。
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
        /** 校验新 file 的大小并替换资源引用，失败时清除选择以避免使用旧文件。 */
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
        /** 提交当前来源的摘要计算，文本与文件共用同一结果提交路径。 */
        calculateDigest: () => process("hash"),
        /** 提交候选来源与目标摘要的比较，将匹配或格式校验状态更新到模型。 */
        verifyCandidate: () => process("verify"),
        /** 清空当前工具的输入、结果和相关资源，避免保留已明确要求遗忘的数据。 */
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
        selectAlgorithm: (value: ShaAlgorithm) => {
          set("algorithm", value);
          set("digestAlgorithm", value);
          set("targetDigest", "");
        },
      };
    },
    ports,
    // 仅恢复算法和文字字段，文件资源及已算出的摘要不进入会话草稿。
    ["sourceMode", "input", "targetDigest", "algorithm"],
    { digest: "", verification: "idle", verificationError: "", operationError: "", busy: false },
    ["sourceMode", "input", "targetDigest", "selectedFile", "algorithm"],
  );
}
