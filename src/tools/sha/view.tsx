/** @file 展示算法选择、来源切换、文件信息、对应算法的摘要结果和校验界面。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 提供多算法文本/文件 SHA 计算、复制与摘要校验界面。 */
import { useRef } from "react";
import { CopyButton } from "../../bindings/react/tool-ui";
import { formatHashFileSize, MAX_HASH_FILE_LABEL } from "../../contracts/files";
import { SHA_ALGORITHMS, SHA_DIGEST_LENGTHS, type ShaAlgorithm } from "./definitions";
import styles from "./styles.module.css";

/** 渲染 SHA 算法、来源、计算结果及候选校验流程。 */
export default function ToolView() {
  const ports = useServices();
  const { snapshot: model, actions } = useController(() => createController(ports));
  const {
    sourceMode,
    input,
    selectedFile,
    digest,
    targetDigest,
    verification,
    verificationError,
    operationError,
    busy,
    algorithm,
    digestAlgorithm,
  } = model;
  const {
    changeSourceMode,
    handleTextChange,
    handleFileChange,
    calculateDigest,
    verifyCandidate,
    clearAll,
    setTargetDigest,
    setVerification,
    setVerificationError,
    setOperationError,
    selectAlgorithm,
  } = actions;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const candidateLabel = sourceMode === "text" ? "候选文本" : "候选文件";
  const hasSource = sourceMode === "text" || Boolean(selectedFile);
  const verificationMessage = {
    idle: `输入目标 ${algorithm} 后，校验上方${candidateLabel}。`,
    match: `校验通过：${candidateLabel}与目标 ${algorithm} 匹配。`,
    mismatch: `校验未通过：${candidateLabel}与目标 ${algorithm} 不匹配。`,
  }[verification];
  const verificationStatus = verificationError ? "error" : verification;
  const canClear = Boolean(
    input || selectedFile || digest || targetDigest || verificationError || operationError,
  );

  return (
    <div className={uiClasses(`tool-form ${styles.tool}`)} aria-busy={busy}>
      {!model.retained && <p role="status">输入过大，离开页面后不会保留。</p>}
      <div className={styles.algorithmControl}>
        <label className={uiClasses("field-label")} htmlFor="sha-algorithm">
          摘要算法
        </label>
        <select
          id="sha-algorithm"
          className={styles.algorithmSelect}
          value={algorithm}
          onChange={(event) => selectAlgorithm(event.target.value as ShaAlgorithm)}
          disabled={busy}
        >
          {SHA_ALGORITHMS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <p className={styles.securityNotice}>
        SHA-1 仅适合兼容旧系统；新用途建议选择 SHA-256 或 SHA-512。
      </p>

      <div className={styles.sourceMode} role="group" aria-label="SHA 输入类型">
        <button
          type="button"
          className={sourceMode === "text" ? styles.activeMode : undefined}
          aria-pressed={sourceMode === "text"}
          onClick={() => changeSourceMode("text")}
          disabled={busy}
        >
          文本
        </button>
        <button
          type="button"
          className={sourceMode === "file" ? styles.activeMode : undefined}
          aria-pressed={sourceMode === "file"}
          onClick={() => changeSourceMode("file")}
          disabled={busy}
        >
          文件
        </button>
      </div>

      {sourceMode === "text" ? (
        <>
          <label className={uiClasses("field-label")} htmlFor="sha-input">
            原始文本或候选文本
          </label>
          <textarea
            ref={inputRef}
            id="sha-input"
            className={uiClasses(`tool-textarea ${styles.input}`)}
            value={input}
            onChange={(event) => handleTextChange(event.target.value)}
            placeholder="输入要计算 SHA 摘要的文本，支持中文与 Emoji"
            aria-describedby="sha-input-help"
            spellCheck={false}
            disabled={busy}
          />
          <p id="sha-input-help" className={styles.help}>
            按 UTF-8 字节计算，不会自动去除首尾空格或换行；空文本也有固定摘要。
          </p>
        </>
      ) : (
        <div className={styles.fileSource}>
          <label className={uiClasses("field-label")} htmlFor="sha-file">
            原始文件或候选文件
          </label>
          <input
            ref={fileInputRef}
            id="sha-file"
            className={styles.fileInput}
            type="file"
            onChange={(event) =>
              handleFileChange(
                event.currentTarget.files?.[0]
                  ? ports.files.wrap(event.currentTarget.files[0])
                  : null,
              )
            }
            aria-describedby="sha-file-help sha-file-status"
            disabled={busy}
          />
          <p id="sha-file-help" className={styles.help}>
            最大 {MAX_HASH_FILE_LABEL}；文件仅在当前浏览器本地读取，不会上传。
          </p>
          <div id="sha-file-status" className={styles.fileStatus} role="status" aria-live="polite">
            {selectedFile ? (
              <>
                <strong>{selectedFile.name}</strong>
                <span>{formatHashFileSize(selectedFile.size)}</span>
              </>
            ) : (
              <span>尚未选择文件</span>
            )}
          </div>
        </div>
      )}

      <div className={uiClasses("tool-actions")}>
        {busy && (
          <button
            type="button"
            className={uiClasses("button button-secondary")}
            onClick={actions.cancel}
          >
            取消计算
          </button>
        )}
        <button
          className={uiClasses("button button-primary")}
          type="button"
          onClick={calculateDigest}
          disabled={busy || !hasSource}
        >
          {busy
            ? "正在计算…"
            : sourceMode === "file"
              ? `计算文件 ${algorithm}`
              : `计算 ${algorithm}`}
        </button>
        <button
          className={uiClasses("button button-secondary")}
          type="button"
          onClick={() => {
            clearAll();
            if (fileInputRef.current) fileInputRef.current.value = "";
            inputRef.current?.focus();
          }}
          disabled={busy || !canClear}
        >
          清空
        </button>
      </div>

      {operationError ? (
        <p className={styles.operationError} role="alert">
          {operationError}
        </p>
      ) : null}

      <section className={styles.result} aria-labelledby="sha-result-title">
        <div className={styles.resultHeading}>
          <h3 id="sha-result-title">{digestAlgorithm} 结果</h3>
          <CopyButton value={digest} label={`${digestAlgorithm} 结果`} />
        </div>
        <output className={digest ? styles.digest : styles.waiting}>{digest || "等待计算"}</output>
      </section>

      <section className={styles.verification} aria-labelledby="sha-verify-title">
        <div className={styles.verificationHeading}>
          <h3 id="sha-verify-title">摘要校验</h3>
          <span>单向摘要</span>
        </div>
        <p className={styles.notice}>
          SHA 不能直接还原原始内容；可在此校验上方候选内容是否匹配目标摘要。
        </p>
        <label className={uiClasses("field-label")} htmlFor="sha-target">
          目标 {algorithm}
        </label>
        <input
          id="sha-target"
          className={uiClasses(`tool-input tool-code ${styles.target}`)}
          value={targetDigest}
          onChange={(event) => {
            setTargetDigest(event.target.value);
            setVerification("idle");
            setVerificationError("");
            setOperationError("");
          }}
          placeholder={`${SHA_DIGEST_LENGTHS[algorithm]} 位十六进制摘要`}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(verificationError)}
          aria-describedby="sha-verification-status"
          disabled={busy}
        />
        <div className={uiClasses("tool-actions")}>
          <button
            className={uiClasses("button button-secondary")}
            type="button"
            onClick={verifyCandidate}
            disabled={busy || !hasSource}
          >
            校验{candidateLabel}
          </button>
        </div>
        <p
          id="sha-verification-status"
          className={uiClasses(`${styles.verificationStatus} ${styles[verificationStatus]}`)}
          role={verificationError ? "alert" : "status"}
          aria-live="polite"
        >
          <span aria-hidden="true">
            {
              {
                idle: "i",
                match: "✓",
                mismatch: "×",
                error: "!",
              }[verificationStatus]
            }
          </span>
          {verificationError || verificationMessage}
        </p>
      </section>
    </div>
  );
}
