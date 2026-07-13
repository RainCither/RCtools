"use client";

import { useState } from "react";
import { ToolStatus } from "../shared/tool-ui";

export default function TimestampTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ local: string; iso: string; seconds: string; milliseconds: string } | null>(null);
  const [error, setError] = useState("");

  function convert(value = input) {
    const cleanValue = value.trim();
    let date: Date;

    if (!cleanValue) {
      setResult(null);
      setError("请输入 10/13 位时间戳或可识别的日期时间。");
      return;
    }

    if (/^-?\d+$/.test(cleanValue)) {
      const isSeconds = /^-?\d{10}$/.test(cleanValue);
      const isMilliseconds = /^-?\d{13}$/.test(cleanValue);

      if (!isSeconds && !isMilliseconds) {
        setResult(null);
        setError("时间戳必须是 10 位秒数或 13 位毫秒数。");
        return;
      }

      const numeric = Number(cleanValue);
      date = new Date(isSeconds ? numeric * 1000 : numeric);
    } else {
      date = new Date(cleanValue);
    }

    if (Number.isNaN(date.getTime())) {
      setResult(null);
      setError("请输入 10/13 位时间戳或可识别的日期时间。");
      return;
    }

    setResult({
      local: date.toLocaleString("zh-CN", { hour12: false }),
      iso: date.toISOString(),
      seconds: Math.floor(date.getTime() / 1000).toString(),
      milliseconds: date.getTime().toString(),
    });
    setError("");
  }

  function useNow() {
    const now = Date.now().toString();
    setInput(now);
    convert(now);
  }

  return (
    <div className="tool-form">
      <label className="field-label" htmlFor="timestamp-input">时间戳或日期</label>
      <input id="timestamp-input" className="tool-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="例如：1720584000 或 2026-07-10 14:00" />
      <div className="tool-actions">
        <button className="button button-primary" type="button" onClick={() => convert()}>转换</button>
        <button className="button button-secondary" type="button" onClick={useNow}>使用当前时间</button>
      </div>
      <ToolStatus error={error} message={result ? "转换完成。" : undefined} />
      <dl className="result-list">
        <div><dt>本地时间</dt><dd>{result?.local ?? "—"}</dd></div>
        <div><dt>ISO 8601</dt><dd>{result?.iso ?? "—"}</dd></div>
        <div><dt>秒</dt><dd>{result?.seconds ?? "—"}</dd></div>
        <div><dt>毫秒</dt><dd>{result?.milliseconds ?? "—"}</dd></div>
      </dl>
    </div>
  );
}
