"use client";

import { useState } from "react";
import { CodeTransformTool } from "../shared/code-transform-tool";
import {
  formatJavaScript,
  minifyJavaScript,
  type JavaScriptMinifyMode,
} from "./js-formatter-core";
import styles from "./styles.module.css";

const INITIAL_JAVASCRIPT = `const greet=(name)=>{const message=\`你好，\${name}\`;console.log(message)};greet("工具匣");`;

export default function JsFormatterTool() {
  const [mode, setMode] = useState<JavaScriptMinifyMode>("mangle");

  return (
    <CodeTransformTool
      idPrefix="js-formatter"
      languageLabel="JavaScript"
      initialValue={INITIAL_JAVASCRIPT}
      inputPlaceholder="粘贴标准 JavaScript 或 ES Module 内容"
      outputPlaceholder="格式化或压缩后的 JavaScript"
      format={formatJavaScript}
      minify={(input) => minifyJavaScript(input, mode)}
      renderSettings={(busy) => (
        <div className={styles.settings}>
          <span className="field-label" id="js-formatter-mode-label">
            压缩方式
          </span>
          <div
            className={styles.segmented}
            role="group"
            aria-labelledby="js-formatter-mode-label"
          >
            <button
              type="button"
              className={mode === "mangle" ? styles.active : undefined}
              aria-pressed={mode === "mangle"}
              onClick={() => setMode("mangle")}
              disabled={busy}
            >
              改名压缩
            </button>
            <button
              type="button"
              className={mode === "preserve-names" ? styles.active : undefined}
              aria-pressed={mode === "preserve-names"}
              onClick={() => setMode("preserve-names")}
              disabled={busy}
            >
              保留名称
            </button>
          </div>
        </div>
      )}
    />
  );
}
