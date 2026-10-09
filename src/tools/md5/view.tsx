import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 提供文本/文件 MD5 计算、复制和候选内容校验界面。 */
import { useRef } from "react";
import { CopyButton } from "../../bindings/react/tool-ui";
import { formatHashFileSize, MAX_HASH_FILE_LABEL } from "../../contracts/files";
import styles from "./styles.module.css";

/** 渲染 MD5 来源选择、摘要计算和摘要匹配流程。 */
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
  } = actions;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const candidateLabel = sourceMode === "text" ? "候选文本" : "候选文件";
  const hasSource = sourceMode === "text" || Boolean(selectedFile);
  const verificationMessage = {
    idle: `输入目标 MD5 后，校验上方${candidateLabel}。`,
    match: `校验通过：${candidateLabel}与目标 MD5 匹配。`,
    mismatch: `校验未通过：${candidateLabel}与目标 MD5 不匹配。`,
  }[verification];
  const verificationStatus = verificationError ? "error" : verification;
  const canClear = Boolean(
    input || selectedFile || digest || targetDigest || verificationError || operationError,
  );

  return (
    <div className={uiClasses(`tool-form ${styles.tool}`)} aria-busy={busy}>
      {!model.retained && <p role="status">输入过大，离开页面后不会保留。</p>}
      <div className={styles.sourceMode} role="group" aria-label="MD5 输入类型">
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
          <label className={uiClasses("field-label")} htmlFor="md5-input">
            原始文本或候选文本
          </label>
          <textarea
            ref={inputRef}
            id="md5-input"
            className={uiClasses(`tool-textarea ${styles.input}`)}
            value={input}
            onChange={(event) => handleTextChange(event.target.value)}
            placeholder="输入要计算 MD5 的文本，支持中文与 Emoji"
            aria-describedby="md5-input-help"
            spellCheck={false}
            disabled={busy}
          />
          <p id="md5-input-help" className={styles.help}>
            按 UTF-8 字节计算，不会自动去除首尾空格或换行；空文本也有固定的 MD5。
          </p>
        </>
      ) : (
        <div className={styles.fileSource}>
          <label className={uiClasses("field-label")} htmlFor="md5-file">
            原始文件或候选文件
          </label>
          <input
            ref={fileInputRef}
            id="md5-file"
            className={styles.fileInput}
            type="file"
            onChange={(event) =>
              handleFileChange(
                event.currentTarget.files?.[0]
                  ? ports.files.wrap(event.currentTarget.files[0])
                  : null,
              )
            }
            aria-describedby="md5-file-help md5-file-status"
            disabled={busy}
          />
          <p id="md5-file-help" className={styles.help}>
            最大 {MAX_HASH_FILE_LABEL}；文件仅在当前浏览器本地读取，不会上传。
          </p>
          <div id="md5-file-status" className={styles.fileStatus} role="status" aria-live="polite">
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
          {busy ? "正在计算…" : sourceMode === "file" ? "计算文件 MD5" : "计算 MD5"}
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

      <section className={styles.result} aria-labelledby="md5-result-title">
        <div className={styles.resultHeading}>
          <h3 id="md5-result-title">MD5 结果</h3>
          <CopyButton value={digest} label="MD5 结果" />
        </div>
        <output className={digest ? styles.digest : styles.waiting}>{digest || "等待计算"}</output>
      </section>

      <section className={styles.verification} aria-labelledby="md5-verify-title">
        <div className={styles.verificationHeading}>
          <h3 id="md5-verify-title">摘要校验</h3>
          <span>MD5 不可逆</span>
        </div>
        <p className={styles.notice}>
          MD5 是单向摘要，不能直接还原原始内容；可在此校验上方候选内容是否匹配目标摘要。
        </p>
        <label className={uiClasses("field-label")} htmlFor="md5-target">
          目标 MD5
        </label>
        <input
          id="md5-target"
          className={uiClasses(`tool-input tool-code ${styles.target}`)}
          value={targetDigest}
          onChange={(event) => {
            setTargetDigest(event.target.value);
            setVerification("idle");
            setVerificationError("");
            setOperationError("");
          }}
          placeholder="32 位十六进制摘要"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(verificationError)}
          aria-describedby="md5-verification-status"
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
          id="md5-verification-status"
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
