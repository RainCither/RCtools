"use client";

import { useRef, useState } from "react";
import { CopyButton } from "../shared/tool-ui";
import {
  COMMON_BASES,
  convertBaseInteger,
  type CommonBase,
} from "./base-converter-core";
import styles from "./styles.module.css";

const BASE_OPTIONS: ReadonlyArray<{
  value: CommonBase;
  label: string;
  shortLabel: string;
}> = [
  { value: 2, label: "二进制", shortLabel: "Base 2" },
  { value: 8, label: "八进制", shortLabel: "Base 8" },
  { value: 10, label: "十进制", shortLabel: "Base 10" },
  { value: 16, label: "十六进制", shortLabel: "Base 16" },
];

export default function BaseConverterTool() {
  const [sourceBase, setSourceBase] = useState<CommonBase>(10);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversion = convertBaseInteger(input, sourceBase);
  const helperId = "base-converter-input-help";

  function clearInput() {
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className={`tool-form ${styles.tool}`}>
      <div className={styles.controls}>
        <label className={styles.baseField} htmlFor="base-converter-source-base">
          <span className="field-label">输入进制</span>
          <select
            id="base-converter-source-base"
            className={styles.select}
            value={sourceBase}
            onChange={(event) =>
              setSourceBase(Number(event.target.value) as CommonBase)}
          >
            {BASE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}（{option.value}）
              </option>
            ))}
          </select>
        </label>

        <button
          className="button button-secondary"
          type="button"
          onClick={clearInput}
          disabled={!input}
        >
          清空
        </button>
      </div>

      <label className="field-label" htmlFor="base-converter-input">
        待转换整数
      </label>
      <textarea
        ref={inputRef}
        id="base-converter-input"
        className={`tool-textarea tool-code ${styles.input}`}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="例如：255、-0xFF 或超长整数"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(conversion.error)}
        aria-describedby={helperId}
      />
      <p
        id={helperId}
        className={conversion.error ? styles.error : styles.help}
        role={conversion.error ? "alert" : undefined}
      >
        {conversion.error ||
          "支持正负号和匹配的 0b、0o、0x 前缀；不支持小数与数字分隔符。"}
      </p>

      <section className={styles.results} aria-labelledby="base-converter-results-title">
        <div className={styles.resultsHeading}>
          <h3 id="base-converter-results-title">转换结果</h3>
          <span>{conversion.outputs ? "已实时更新" : "等待输入"}</span>
        </div>

        <div className={styles.resultList}>
          {COMMON_BASES.map((base) => {
            const option = BASE_OPTIONS.find((item) => item.value === base)!;
            const value = conversion.outputs?.[base] ?? "";

            return (
              <div className={styles.resultRow} key={base}>
                <span className={styles.resultLabel}>
                  <strong>{option.label}</strong>
                  <small>{option.shortLabel}</small>
                </span>
                <output
                  className={value ? styles.resultValue : styles.resultWaiting}
                  aria-label={`${option.label}结果`}
                >
                  {value || "—"}
                </output>
                <CopyButton value={value} label={`${option.label}结果`} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
