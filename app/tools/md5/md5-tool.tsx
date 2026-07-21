"use client";

import { useRef, useState } from "react";
import {
  formatHashFileSize,
  MAX_HASH_FILE_LABEL,
  readHashFileBytes,
  type HashSourceMode,
  validateHashFile,
} from "../shared/hash-file";
import { CopyButton } from "../shared/tool-ui";
import { md5Bytes, md5Hex, verifyMd5Digest } from "./md5-core";
import styles from "./styles.module.css";

type VerificationState = "idle" | "match" | "mismatch";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "计算失败，请稍后重试。";
}

export default function Md5Tool() {
  const [sourceMode, setSourceMode] = useState<HashSourceMode>("text");
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [digest, setDigest] = useState("");
  const [targetDigest, setTargetDigest] = useState("");
  const [verification, setVerification] = useState<VerificationState>("idle");
  const [verificationError, setVerificationError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetComputedState() {
    setDigest("");
    setVerification("idle");
    setVerificationError("");
    setOperationError("");
  }

  function changeSourceMode(nextMode: HashSourceMode) {
    if (nextMode === sourceMode) return;
    setSourceMode(nextMode);
    resetComputedState();
  }

  function handleTextChange(value: string) {
    setInput(value);
    resetComputedState();
  }

  function handleFileChange(file: File | null) {
    resetComputedState();

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateHashFile(file);
    if (validationError) {
      setSelectedFile(null);
      setOperationError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function hashCurrentSource() {
    if (sourceMode === "text") return md5Hex(input);
    if (!selectedFile) throw new Error("请先选择要计算的文件。");
    return md5Bytes(await readHashFileBytes(selectedFile));
  }

  async function calculateDigest() {
    setBusy(true);
    setDigest("");
    setVerification("idle");
    setVerificationError("");
    setOperationError("");

    try {
      setDigest(await hashCurrentSource());
    } catch (error) {
      setOperationError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCandidate() {
    setBusy(true);
    setDigest("");
    setVerification("idle");
    setVerificationError("");
    setOperationError("");

    try {
      const result = verifyMd5Digest(targetDigest, await hashCurrentSource());
      setDigest(result.digest);
      setVerificationError(result.error);
      setVerification(
        result.matches === null
          ? "idle"
          : result.matches
            ? "match"
            : "mismatch",
      );
    } catch (error) {
      setOperationError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearAll() {
    setInput("");
    setSelectedFile(null);
    setDigest("");
    setTargetDigest("");
    setVerification("idle");
    setVerificationError("");
    setOperationError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (sourceMode === "text") inputRef.current?.focus();
    else fileInputRef.current?.focus();
  }

  const candidateLabel = sourceMode === "text" ? "候选文本" : "候选文件";
  const hasSource = sourceMode === "text" || Boolean(selectedFile);
  const verificationMessage = {
    idle: `输入目标 MD5 后，校验上方${candidateLabel}。`,
    match: `校验通过：${candidateLabel}与目标 MD5 匹配。`,
    mismatch: `校验未通过：${candidateLabel}与目标 MD5 不匹配。`,
  }[verification];
  const verificationStatus = verificationError ? "error" : verification;
  const canClear = Boolean(
    input ||
    selectedFile ||
    digest ||
    targetDigest ||
    verificationError ||
    operationError,
  );

  return (
    <div className={`tool-form ${styles.tool}`} aria-busy={busy}>
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
          <label className="field-label" htmlFor="md5-input">
            原始文本或候选文本
          </label>
          <textarea
            ref={inputRef}
            id="md5-input"
            className={`tool-textarea ${styles.input}`}
            value={input}
            onChange={(event) => handleTextChange(event.target.value)}
            placeholder="输入要计算 MD5 的文本，支持中文与 Emoji"
            aria-describedby="md5-input-help"
            spellCheck={false}
            disabled={busy}
          />
          <p id="md5-input-help" className={styles.help}>
            按 UTF-8 字节计算，不会自动去除首尾空格或换行；空文本也有固定的
            MD5。
          </p>
        </>
      ) : (
        <div className={styles.fileSource}>
          <label className="field-label" htmlFor="md5-file">
            原始文件或候选文件
          </label>
          <input
            ref={fileInputRef}
            id="md5-file"
            className={styles.fileInput}
            type="file"
            onChange={(event) =>
              handleFileChange(event.currentTarget.files?.[0] ?? null)
            }
            aria-describedby="md5-file-help md5-file-status"
            disabled={busy}
          />
          <p id="md5-file-help" className={styles.help}>
            最大 {MAX_HASH_FILE_LABEL}；文件仅在当前浏览器本地读取，不会上传。
          </p>
          <div
            id="md5-file-status"
            className={styles.fileStatus}
            role="status"
            aria-live="polite"
          >
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

      <div className="tool-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={calculateDigest}
          disabled={busy || !hasSource}
        >
          {busy
            ? "正在计算…"
            : sourceMode === "file"
              ? "计算文件 MD5"
              : "计算 MD5"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={clearAll}
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
        <output className={digest ? styles.digest : styles.waiting}>
          {digest || "等待计算"}
        </output>
      </section>

      <section
        className={styles.verification}
        aria-labelledby="md5-verify-title"
      >
        <div className={styles.verificationHeading}>
          <h3 id="md5-verify-title">摘要校验</h3>
          <span>MD5 不可逆</span>
        </div>
        <p className={styles.notice}>
          MD5
          是单向摘要，不能直接还原原始内容；可在此校验上方候选内容是否匹配目标摘要。
        </p>
        <label className="field-label" htmlFor="md5-target">
          目标 MD5
        </label>
        <input
          id="md5-target"
          className={`tool-input tool-code ${styles.target}`}
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
        <div className="tool-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={verifyCandidate}
            disabled={busy || !hasSource}
          >
            校验{candidateLabel}
          </button>
        </div>
        <p
          id="md5-verification-status"
          className={`${styles.verificationStatus} ${styles[verificationStatus]}`}
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
