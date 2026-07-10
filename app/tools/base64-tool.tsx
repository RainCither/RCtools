"use client";

import { useState } from "react";
import { CopyButton, ToolStatus } from "./shared";

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  function transform(mode: "encode" | "decode") {
    try {
      setOutput(mode === "encode" ? encodeBase64(input) : decodeBase64(input));
      setError("");
    } catch {
      setOutput("");
      setError("内容不是有效的 Base64 文本。");
    }
  }

  return (
    <div className="tool-form">
      <label className="field-label" htmlFor="base64-input">原始内容</label>
      <textarea id="base64-input" className="tool-textarea" value={input} onChange={(event) => setInput(event.target.value)} placeholder="支持中文与 Emoji" />
      <div className="tool-actions">
        <button className="button button-primary" type="button" onClick={() => transform("encode")}>编码</button>
        <button className="button button-secondary" type="button" onClick={() => transform("decode")}>解码</button>
        <CopyButton value={output} />
      </div>
      <ToolStatus error={error} message={output ? "处理完成。" : undefined} />
      <label className="field-label" htmlFor="base64-output">处理结果</label>
      <textarea id="base64-output" className="tool-textarea tool-code" value={output} readOnly placeholder="结果" />
    </div>
  );
}
