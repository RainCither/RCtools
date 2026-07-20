"use client";

import { useRef, useState } from "react";
import { CopyButton } from "../shared/tool-ui";
import {
  FLOAT_FORMATS,
  convertFloatInput,
  type FloatClassification,
  type FloatFormat,
  type FloatInputMode,
} from "./ieee-754-core";
import styles from "./styles.module.css";

const CLASSIFICATION_LABELS: Record<FloatClassification, string> = {
  zero: "零",
  subnormal: "非规格化数",
  normal: "规格化数",
  infinity: "无穷大",
  nan: "NaN",
};

const FORMAT_LABELS: Record<FloatFormat, string> = {
  float32: "Float32",
  float64: "Float64",
};

export default function Ieee754Tool() {
  const [mode, setMode] = useState<FloatInputMode>("number");
  const [format, setFormat] = useState<FloatFormat>("float32");
  const [drafts, setDrafts] = useState<Record<FloatInputMode, string>>({
    number: "",
    bits: "",
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const input = drafts[mode];
  const conversion = convertFloatInput(input, format, mode);
  const data = conversion.data;
  const definition = FLOAT_FORMATS[format];
  const formatLabel = FORMAT_LABELS[format];
  const helperId = "ieee-754-input-help";

  const resultItems = [
    {
      label: "存储值",
      hint: formatLabel,
      value: data?.storedValue ?? "",
    },
    {
      label: "数值分类",
      hint: "IEEE-754",
      value: data ? CLASSIFICATION_LABELS[data.classification] : "",
    },
    {
      label: "符号位",
      hint: "1 bit",
      value: data?.signBit ?? "",
    },
    {
      label: "指数位",
      hint: `${definition.exponentBits} bits`,
      value: data?.exponentBits ?? "",
    },
    {
      label: "尾数位",
      hint: `${definition.fractionBits} bits`,
      value: data?.fractionBits ?? "",
    },
    {
      label: "完整二进制",
      hint: `${definition.totalBits} bits`,
      value: data?.binary ?? "",
    },
    {
      label: "十六进制",
      hint: `${definition.hexLength} digits`,
      value: data?.hex ?? "",
    },
    {
      label: "大端字节",
      hint: "高位在前",
      value: data?.bigEndianBytes ?? "",
    },
    {
      label: "小端字节",
      hint: "低位在前",
      value: data?.littleEndianBytes ?? "",
    },
  ];

  function updateInput(value: string) {
    setDrafts((current) => ({ ...current, [mode]: value }));
  }

  function changeMode(nextMode: FloatInputMode) {
    setMode(nextMode);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function clearInput() {
    setDrafts((current) => ({ ...current, [mode]: "" }));
    inputRef.current?.focus();
  }

  return (
    <div className={`tool-form ${styles.tool}`}>
      <div className={styles.settings}>
        <div className={styles.controlGroup}>
          <span className="field-label" id="ieee-754-mode-label">
            转换模式
          </span>
          <div
            className={styles.segmented}
            role="group"
            aria-labelledby="ieee-754-mode-label"
          >
            <button
              type="button"
              className={mode === "number" ? styles.active : undefined}
              aria-pressed={mode === "number"}
              onClick={() => changeMode("number")}
            >
              数值转位模式
            </button>
            <button
              type="button"
              className={mode === "bits" ? styles.active : undefined}
              aria-pressed={mode === "bits"}
              onClick={() => changeMode("bits")}
            >
              位模式转数值
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className="field-label" id="ieee-754-format-label">
            浮点格式
          </span>
          <div
            className={styles.segmented}
            role="group"
            aria-labelledby="ieee-754-format-label"
          >
            <button
              type="button"
              className={format === "float32" ? styles.active : undefined}
              aria-pressed={format === "float32"}
              onClick={() => setFormat("float32")}
            >
              Float32
            </button>
            <button
              type="button"
              className={format === "float64" ? styles.active : undefined}
              aria-pressed={format === "float64"}
              onClick={() => setFormat("float64")}
            >
              Float64
            </button>
          </div>
        </div>
      </div>

      <div className={styles.inputHeading}>
        <label className="field-label" htmlFor="ieee-754-input">
          {mode === "number" ? "待转换数值" : "待解析位模式"}
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
      <textarea
        ref={inputRef}
        id="ieee-754-input"
        className={`tool-textarea tool-code ${styles.input}`}
        value={input}
        onChange={(event) => updateInput(event.target.value)}
        placeholder={mode === "number"
          ? "例如：0.1、-0、1.25e-3 或 Infinity"
          : "例如：3F800000 或 00111111…"}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={Boolean(conversion.error)}
        aria-describedby={helperId}
      />
      <p
        id={helperId}
        className={conversion.error ? styles.error : styles.help}
        role={conversion.error ? "alert" : undefined}
      >
        {conversion.error || (mode === "number"
          ? `${formatLabel} 会按 IEEE-754 舍入，并显式保留 -0。`
          : `自动识别二进制或十六进制；可用空格、下划线分组，需正好 ${definition.totalBits} 位或 ${definition.hexLength} 个十六进制字符。`)}
      </p>

      <section className={styles.results} aria-labelledby="ieee-754-results-title">
        <div className={styles.resultsHeading}>
          <h3 id="ieee-754-results-title">转换结果</h3>
          <span aria-live="polite">
            {data ? "已实时更新" : conversion.error ? "请检查输入" : "等待输入"}
          </span>
        </div>

        <div className={styles.resultList}>
          {resultItems.map((item) => (
            <div className={styles.resultRow} key={item.label}>
              <span className={styles.resultLabel}>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              <output
                className={item.value ? styles.resultValue : styles.resultWaiting}
                aria-label={`${item.label}结果`}
              >
                {item.value || "—"}
              </output>
              <CopyButton value={item.value} label={`${item.label}结果`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
