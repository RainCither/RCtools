"use client";

import { useRef, useState, type ReactNode } from "react";
import { CopyButton, ToolStatus } from "./tool-ui";
import styles from "./code-transform-tool.module.css";

type TransformKind = "format" | "minify";

type CodeTransformToolProps = {
  idPrefix: string;
  languageLabel: string;
  initialValue: string;
  inputPlaceholder: string;
  outputPlaceholder: string;
  format: (input: string) => Promise<string>;
  minify: (input: string) => Promise<string>;
  renderSettings?: (busy: boolean) => ReactNode;
};

function getErrorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "处理失败，请检查输入内容。";
}

export function CodeTransformTool({
  idPrefix,
  languageLabel,
  initialValue,
  inputPlaceholder,
  outputPlaceholder,
  format,
  minify,
  renderSettings,
}: CodeTransformToolProps) {
  const [input, setInput] = useState(initialValue);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<TransformKind | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = busyAction !== null;

  function updateInput(value: string) {
    setInput(value);
    setOutput("");
    setError("");
    setMessage("");
  }

  async function transform(kind: TransformKind) {
    if (busy) return;

    setBusyAction(kind);
    setOutput("");
    setError("");
    setMessage(kind === "format" ? "正在格式化…" : "正在压缩…");

    try {
      const result = await (kind === "format" ? format(input) : minify(input));
      setOutput(result);
      setMessage(`${languageLabel}${kind === "format" ? "格式化" : "压缩"}完成。`);
    } catch (cause) {
      setError(getErrorMessage(cause));
      setMessage("");
    } finally {
      setBusyAction(null);
    }
  }

  function clear() {
    setInput("");
    setOutput("");
    setError("");
    setMessage("");
    inputRef.current?.focus();
  }

  return (
    <div className={`tool-form ${styles.tool}`} aria-busy={busy}>
      <label className="field-label" htmlFor={`${idPrefix}-input`}>
        {languageLabel} 内容
      </label>
      <textarea
        ref={inputRef}
        id={`${idPrefix}-input`}
        className={`tool-textarea tool-code ${styles.editor}`}
        value={input}
        onChange={(event) => updateInput(event.target.value)}
        placeholder={inputPlaceholder}
        spellCheck={false}
        disabled={busy}
        aria-invalid={Boolean(error)}
        aria-describedby={`${idPrefix}-status`}
      />

      {renderSettings?.(busy)}

      <div className="tool-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={() => void transform("format")}
          disabled={busy}
        >
          {busyAction === "format" ? "正在格式化…" : "格式化"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => void transform("minify")}
          disabled={busy}
        >
          {busyAction === "minify" ? "正在压缩…" : "压缩"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={clear}
          disabled={busy || (!input && !output && !error)}
        >
          清空
        </button>
        <CopyButton value={output} label={`${languageLabel}处理结果`} />
      </div>

      <div id={`${idPrefix}-status`}>
        <ToolStatus error={error} message={message || undefined} />
      </div>

      <label className="field-label" htmlFor={`${idPrefix}-output`}>
        处理结果
      </label>
      <textarea
        id={`${idPrefix}-output`}
        className={`tool-textarea tool-code ${styles.editor} ${styles.output}`}
        value={output}
        readOnly
        placeholder={outputPlaceholder}
        spellCheck={false}
      />
    </div>
  );
}
