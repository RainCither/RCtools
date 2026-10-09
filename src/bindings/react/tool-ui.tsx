import { useEffect, useRef, useState } from "react";
import { uiClasses } from "../../ui/tool-ui";
import { useServices } from "./services";
export { ToolStatus, uiClasses } from "../../ui/tool-ui";
export function CopyButton({
  value,
  label = "结果",
  idleText = "复制结果",
}: {
  value: string;
  label?: string;
  idleText?: string;
}) {
  const { clipboard } = useServices();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    setStatus("idle");
    return () => {
      active.current = false;
      clearTimeout(timer.current);
    };
  }, [value]);
  async function copy() {
    let next: "copied" | "failed";
    try {
      await clipboard.write(value);
      next = "copied";
    } catch {
      next = "failed";
    }
    if (!active.current) return;
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 1400);
  }
  return (
    <button
      type="button"
      className={uiClasses("button button-secondary")}
      onClick={() => void copy()}
      disabled={!value}
      aria-label={
        status === "copied"
          ? `${label}已复制`
          : status === "failed"
            ? `${label}复制失败`
            : `复制${label}`
      }
      aria-live="polite"
    >
      {status === "copied" ? "已复制" : status === "failed" ? "复制失败" : idleText}
    </button>
  );
}
