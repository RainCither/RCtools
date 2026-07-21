"use client";

import { useRef, useState } from "react";
import { CopyButton } from "../shared/tool-ui";
import { md5Hex, verifyMd5Candidate } from "./md5-core";
import styles from "./styles.module.css";

type VerificationState = "idle" | "match" | "mismatch";

export default function Md5Tool() {
  const [input, setInput] = useState("");
  const [digest, setDigest] = useState("");
  const [targetDigest, setTargetDigest] = useState("");
  const [verification, setVerification] = useState<VerificationState>("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function calculateDigest() {
    setDigest(md5Hex(input));
    setVerification("idle");
    setError("");
  }

  function verifyCandidate() {
    const result = verifyMd5Candidate(targetDigest, input);
    setDigest(result.digest);
    setError(result.error);
    setVerification(
      result.matches === null ? "idle" : result.matches ? "match" : "mismatch",
    );
  }

  function clearAll() {
    setInput("");
    setDigest("");
    setTargetDigest("");
    setVerification("idle");
    setError("");
    inputRef.current?.focus();
  }

  const verificationMessage = {
    idle: "输入目标 MD5 后，校验上方候选文本。",
    match: "校验通过：候选文本与目标 MD5 匹配。",
    mismatch: "校验未通过：候选文本与目标 MD5 不匹配。",
  }[verification];
  const verificationStatus = error ? "error" : verification;

  return (
    <div className={`tool-form ${styles.tool}`}>
      <label className="field-label" htmlFor="md5-input">
        原始文本或候选文本
      </label>
      <textarea
        ref={inputRef}
        id="md5-input"
        className={`tool-textarea ${styles.input}`}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="输入要计算 MD5 的文本，支持中文与 Emoji"
        aria-describedby="md5-input-help"
        spellCheck={false}
      />
      <p id="md5-input-help" className={styles.help}>
        按 UTF-8 字节计算，不会自动去除首尾空格或换行；空文本也有固定的 MD5。
      </p>

      <div className="tool-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={calculateDigest}
        >
          计算 MD5
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={clearAll}
          disabled={!input && !digest && !targetDigest}
        >
          清空
        </button>
      </div>

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
          {
            "MD5 是单向摘要，不能直接还原原文；可在此校验上方候选文本是否匹配目标摘要。"
          }
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
            setError("");
          }}
          placeholder="32 位十六进制摘要"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby="md5-verification-status"
        />
        <div className="tool-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={verifyCandidate}
          >
            校验候选文本
          </button>
        </div>
        <p
          id="md5-verification-status"
          className={`${styles.verificationStatus} ${styles[verificationStatus]}`}
          role={error ? "alert" : "status"}
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
          {error || verificationMessage}
        </p>
      </section>
    </div>
  );
}
