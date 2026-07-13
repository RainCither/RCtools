"use client";

import { useState } from "react";
import { CopyButton, ToolStatus } from "../shared/tool-ui";

export default function JsonTool() {
  const [input, setInput] = useState('{\n  "name": "工具匣",\n  "ready": true\n}');
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function transform(space?: number) {
    try {
      const parsed: unknown = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, space));
      setError("");
    } catch (cause) {
      setOutput("");
      setError(cause instanceof Error ? cause.message : "JSON 内容无效");
    }
  }

  return (
    <div className="tool-form">
      <label className="field-label" htmlFor="json-input">JSON 内容</label>
      <textarea id="json-input" className="tool-textarea tool-code" value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} />
      <div className="tool-actions">
        <button className="button button-primary" type="button" onClick={() => transform(2)}>格式化</button>
        <button className="button button-secondary" type="button" onClick={() => transform()}>压缩</button>
        <CopyButton value={output} />
      </div>
      <ToolStatus error={error} message={output ? "JSON 校验通过。" : undefined} />
      <label className="field-label" htmlFor="json-output">处理结果</label>
      <textarea id="json-output" className="tool-textarea tool-code" value={output} readOnly placeholder="处理后的 JSON" />
    </div>
  );
}
