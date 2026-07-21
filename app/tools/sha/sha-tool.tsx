"use client";

import { useRef, useState } from "react";
import { CopyButton } from "../shared/tool-ui";
import {
  SHA_ALGORITHMS,
  SHA_DIGEST_LENGTHS,
  shaHex,
  type ShaAlgorithm,
  verifyShaCandidate,
} from "./sha-core";
import styles from "./styles.module.css";

type VerificationState = "idle" | "match" | "mismatch";

const DEFAULT_ALGORITHM: ShaAlgorithm = "SHA-256";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "计算失败，请稍后重试。";
}

export default function ShaTool() {
  const [algorithm, setAlgorithm] = useState<ShaAlgorithm>(DEFAULT_ALGORITHM);
  const [input, setInput] = useState("");
  const [digest, setDigest] = useState("");
  const [digestAlgorithm, setDigestAlgorithm] =
    useState<ShaAlgorithm>(DEFAULT_ALGORITHM);
  const [targetDigest, setTargetDigest] = useState("");
  const [verification, setVerification] = useState<VerificationState>("idle");
  const [verificationError, setVerificationError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function selectAlgorithm(nextAlgorithm: ShaAlgorithm) {
    setAlgorithm(nextAlgorithm);
    setDigest("");
    setDigestAlgorithm(nextAlgorithm);
    setTargetDigest("");
    setVerification("idle");
    setVerificationError("");
    setOperationError("");
  }

  async function calculateDigest() {
    setBusy(true);
    setOperationError("");
    setVerification("idle");
    setVerificationError("");

    try {
      setDigest(await shaHex(input, algorithm));
      setDigestAlgorithm(algorithm);
    } catch (error) {
      setDigest("");
      setOperationError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCandidate() {
    setBusy(true);
    setOperationError("");
    setVerificationError("");

    try {
      const result = await verifyShaCandidate(targetDigest, input, algorithm);
      setDigest(result.digest);
      setDigestAlgorithm(algorithm);
      setVerificationError(result.error);
      setVerification(
        result.matches === null
          ? "idle"
          : result.matches
            ? "match"
            : "mismatch",
      );
    } catch (error) {
      setVerification("idle");
      setOperationError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearAll() {
    setInput("");
    setDigest("");
    setTargetDigest("");
    setVerification("idle");
    setVerificationError("");
    setOperationError("");
    inputRef.current?.focus();
  }

  const verificationMessage = {
    idle: `输入目标 ${algorithm} 后，校验上方候选文本。`,
    match: `校验通过：候选文本与目标 ${algorithm} 匹配。`,
    mismatch: `校验未通过：候选文本与目标 ${algorithm} 不匹配。`,
  }[verification];
  const verificationStatus = verificationError ? "error" : verification;

  return (
    <div className={`tool-form ${styles.tool}`} aria-busy={busy}>
      <div className={styles.algorithmControl}>
        <label className="field-label" htmlFor="sha-algorithm">
          摘要算法
        </label>
        <select
          id="sha-algorithm"
          className={styles.algorithmSelect}
          value={algorithm}
          onChange={(event) =>
            selectAlgorithm(event.target.value as ShaAlgorithm)
          }
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

      <label className="field-label" htmlFor="sha-input">
        原始文本或候选文本
      </label>
      <textarea
        ref={inputRef}
        id="sha-input"
        className={`tool-textarea ${styles.input}`}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="输入要计算 SHA 摘要的文本，支持中文与 Emoji"
        aria-describedby="sha-input-help"
        spellCheck={false}
      />
      <p id="sha-input-help" className={styles.help}>
        按 UTF-8 字节计算，不会自动去除首尾空格或换行；空文本也有固定摘要。
      </p>

      <div className="tool-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={calculateDigest}
          disabled={busy}
        >
          {busy ? "正在计算…" : `计算 ${algorithm}`}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={clearAll}
          disabled={
            busy || (!input && !digest && !targetDigest && !operationError)
          }
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
        <output className={digest ? styles.digest : styles.waiting}>
          {digest || "等待计算"}
        </output>
      </section>

      <section
        className={styles.verification}
        aria-labelledby="sha-verify-title"
      >
        <div className={styles.verificationHeading}>
          <h3 id="sha-verify-title">摘要校验</h3>
          <span>单向摘要</span>
        </div>
        <p className={styles.notice}>
          SHA 不能直接还原原文；可在此校验上方候选文本是否匹配目标摘要。
        </p>
        <label className="field-label" htmlFor="sha-target">
          目标 {algorithm}
        </label>
        <input
          id="sha-target"
          className={`tool-input tool-code ${styles.target}`}
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
        />
        <div className="tool-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={verifyCandidate}
            disabled={busy}
          >
            校验候选文本
          </button>
        </div>
        <p
          id="sha-verification-status"
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
