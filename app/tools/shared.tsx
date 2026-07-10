"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="button button-secondary" type="button" onClick={copy} disabled={!value}>
      {copied ? "已复制" : "复制结果"}
    </button>
  );
}

export function ToolStatus({ error, message }: { error?: string; message?: string }) {
  return (
    <p className={error ? "tool-status tool-status-error" : "tool-status"} aria-live="polite">
      {error ?? message ?? "结果会显示在这里。"}
    </p>
  );
}
