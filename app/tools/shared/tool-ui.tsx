"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

export function CopyButton({
  value,
  label = "结果",
}: {
  value: string;
  label?: string;
}) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  function scheduleReset() {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setStatus("idle");
      resetTimerRef.current = null;
    }, 1400);
  }

  async function copy() {
    if (!value) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    scheduleReset();
  }

  return (
    <button
      className="button button-secondary"
      type="button"
      onClick={copy}
      disabled={!value}
      aria-label={{
        idle: `复制${label}`,
        copied: `${label}已复制`,
        failed: `${label}复制失败`,
      }[status]}
      aria-live="polite"
    >
      {{ idle: "复制结果", copied: "已复制", failed: "复制失败" }[status]}
    </button>
  );
}

export function ToolStatus({ error, message }: { error?: string; message?: string }) {
  return (
    <p className={error ? "tool-status tool-status-error" : "tool-status"} aria-live="polite">
      {error || message || "结果会显示在这里。"}
    </p>
  );
}
