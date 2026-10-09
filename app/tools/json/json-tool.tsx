/** 校验 JSON 文本，并按用户选择输出美化或紧凑格式。 */
import { useState } from "react";
import { CopyButton, ToolStatus } from "../shared/tool-ui";
import { formatJson, minifyJson } from "./json-core";

/** 渲染 JSON 编辑器及其格式化、压缩和复制操作。 */
export default function JsonTool() {
  const [input, setInput] = useState('{\n  "name": "工具匣",\n  "ready": true\n}');
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  /** 校验并调整排版，保留原始数字和字符串内容。 */
  function transform(space?: number) {
    try {
      setOutput(space ? formatJson(input) : minifyJson(input));
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
