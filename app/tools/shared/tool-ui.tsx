/** 提供各工具共用的复制反馈按钮与可访问状态提示。 */
import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

/** 复制结果并短暂显示成功或失败状态。 */
export function CopyButton({
  value,
  label = "结果",
  idleText = "复制结果",
}: {
  value: string;
  label?: string;
  idleText?: string;
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

  /** 重启反馈复位计时器，避免连续复制产生多个定时器。 */
  function scheduleReset() {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setStatus("idle");
      resetTimerRef.current = null;
    }, 1400);
  }

  /** 通过 Clipboard API 写入结果并记录操作状态。 */
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
      {{ idle: idleText, copied: "已复制", failed: "复制失败" }[status]}
    </button>
  );
}

/** 以 aria-live 区域展示错误、成功消息或默认占位文案。 */
export function ToolStatus({ error, message }: { error?: string; message?: string }) {
  return (
    <p className={error ? "tool-status tool-status-error" : "tool-status"} aria-live="polite">
      {error || message || "结果会显示在这里。"}
    </p>
  );
}
