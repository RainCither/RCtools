/** @file 提供连接剪贴板服务的 CopyButton，管理复制成功/失败反馈和计时器；同时转导出公共状态组件与样式辅助函数。 */
import { useEffect, useRef, useState } from "react";
import { uiClasses } from "../../ui/tool-ui";
import { useServices } from "./services";
export { ToolStatus, uiClasses } from "../../ui/tool-ui";
/** 渲染 value 的复制按钮，label 与 idleText 控制提示；管理完成反馈并清理延迟复位计时器。 */
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
  /** 等待剪贴板结果后检查挂载状态，再显示短暂反馈，防止异步完成更新已离开的按钮。 */
  async function copy() {
    let next: "copied" | "failed";
    try {
      await clipboard.write(value);
      next = "copied";
    } catch {
      next = "failed";
    }
    // 剪贴板是异步能力，完成时按钮可能已离开页面或切换到新的结果。
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
