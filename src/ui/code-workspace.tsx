import type { ReactNode } from "react";
import styles from "./code-workspace.module.css";
import { ToolStatus, uiClasses } from "./tool-ui";
export function CodeWorkspace({
  id,
  language,
  input,
  output,
  error,
  status,
  update,
  run,
  clear,
  cancel,
  copy,
  settings,
  retained = true,
}: {
  id: string;
  language: string;
  input: string;
  output: string;
  error: string;
  status: string;
  update(value: string): void;
  run(operation: "format" | "minify"): void;
  clear(): void;
  cancel(): void;
  copy: ReactNode;
  settings?: ReactNode;
  retained?: boolean;
}) {
  const busy = status === "running" || status === "pending";
  return (
    <div className={`${uiClasses("tool-form")} ${styles.tool}`} aria-busy={busy}>
      <label className={uiClasses("field-label")} htmlFor={`${id}-input`}>
        {language} 内容
      </label>
      <textarea
        id={`${id}-input`}
        className={`${uiClasses("tool-textarea tool-code")} ${styles.editor}`}
        value={input}
        onChange={(event) => update(event.target.value)}
        spellCheck={false}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-status`}
      />
      {settings}
      <div className={uiClasses("tool-actions")}>
        <button
          type="button"
          className={uiClasses("button button-primary")}
          onClick={() => run("format")}
        >
          格式化
        </button>
        <button
          type="button"
          className={uiClasses("button button-secondary")}
          onClick={() => run("minify")}
        >
          压缩
        </button>
        <button
          type="button"
          className={uiClasses("button button-secondary")}
          onClick={clear}
          disabled={!input && !output}
        >
          清空
        </button>
        {busy && (
          <button type="button" className={uiClasses("button button-secondary")} onClick={cancel}>
            取消计算
          </button>
        )}
        {copy}
      </div>
      <div id={`${id}-status`}>
        <ToolStatus
          error={error}
          message={busy ? "正在处理…" : status === "success" ? `${language}处理完成。` : undefined}
        />
      </div>
      {!retained && <p role="status">输入过大，离开页面后不会保留。</p>}
      <label className={uiClasses("field-label")} htmlFor={`${id}-output`}>
        处理结果
      </label>
      <textarea
        id={`${id}-output`}
        className={`${uiClasses("tool-textarea tool-code")} ${styles.editor} ${styles.output}`}
        value={output}
        readOnly
        placeholder="处理后的结果"
        spellCheck={false}
      />
    </div>
  );
}
