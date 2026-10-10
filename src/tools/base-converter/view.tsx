/** @file 展示来源进制选择、超长整数输入、四种结果和逐项复制，清空后恢复输入焦点。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 提供常用整数进制选择、实时转换与逐项复制界面。 */
import { useRef } from "react";
import { CopyButton } from "../../bindings/react/tool-ui";
import { COMMON_BASES, type CommonBase } from "./core";
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

/** 渲染支持超长 BigInt 输入的进制转换工具。 */
export default function BaseConverterTool() {
  const ports = useServices();
  const { snapshot: s, actions } = useController(() => createController(ports));
  const sourceBase = s.draft.base,
    input = s.draft.input;
  const setInput = (input: string) => actions.update({ ...s.draft, input });
  const setSourceBase = (base: CommonBase) => actions.update({ ...s.draft, base });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversion = { ...s.output, error: s.error?.message ?? s.output.error };
  const helperId = "base-converter-input-help";

  /** 清空输入并恢复编辑器焦点。 */
  function clearInput() {
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className={uiClasses(`tool-form ${styles.tool}`)}>
      {s.status === "running" && (
        <button
          type="button"
          className={uiClasses("button button-secondary")}
          onClick={actions.cancel}
        >
          取消计算
        </button>
      )}
      {!s.retained && <p role="status">输入过大，离开页面后不会保留。</p>}
      <div className={styles.controls}>
        <label className={styles.baseField} htmlFor="base-converter-source-base">
          <span className={uiClasses("field-label")}>输入进制</span>
          <select
            id="base-converter-source-base"
            className={styles.select}
            value={sourceBase}
            onChange={(event) => setSourceBase(Number(event.target.value) as CommonBase)}
          >
            {BASE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}（{option.value}）
              </option>
            ))}
          </select>
        </label>

        <button
          className={uiClasses("button button-secondary")}
          type="button"
          onClick={clearInput}
          disabled={!input}
        >
          清空
        </button>
      </div>

      <label className={uiClasses("field-label")} htmlFor="base-converter-input">
        待转换整数
      </label>
      <textarea
        ref={inputRef}
        id="base-converter-input"
        className={uiClasses(`tool-textarea tool-code ${styles.input}`)}
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
        {conversion.error || "支持正负号和匹配的 0b、0o、0x 前缀；不支持小数与数字分隔符。"}
      </p>

      <section className={styles.results} aria-labelledby="base-converter-results-title">
        <div className={styles.resultsHeading}>
          <h3 id="base-converter-results-title">转换结果</h3>
          <span>{conversion.outputs ? "已实时更新" : "等待输入"}</span>
        </div>

        <div className={styles.resultList}>
          {COMMON_BASES.map((base) => {
            const option = BASE_OPTIONS.find((item) => item.value === base);
            if (!option) return null;
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
