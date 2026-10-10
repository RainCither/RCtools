/** @file 提供通用状态提示 ToolStatus、操作按钮 ActionButton 和样式组合函数 uiClasses()。 */
import type { ReactNode } from "react";
import styles from "./toolbox.module.css";
import { shellClasses } from "./shell-classes";
/** 组合页面外壳和工具样式的局部类名，返回适用于公共控件的 className。 */
export function uiClasses(value: string) {
  return value
    .split(/\s+/)
    .map((name) => `${shellClasses(name)} ${styles[name] ?? ""}`)
    .join(" ");
}
/** 根据 error 或 message 渲染状态提示，使用 alert/status 语义让辅助技术播报更新。 */
export function ToolStatus({
  error,
  message,
}: {
  error?: string | undefined;
  message?: string | undefined;
}) {
  return (
    <p
      className={uiClasses(error ? "tool-status tool-status-error" : "tool-status")}
      role={error ? "alert" : "status"}
      aria-live="polite"
    >
      {error || message || "结果会显示在这里。"}
    </p>
  );
}
/** 按 primary 和 disabled 渲染公共操作按钮，将用户动作交给 onClick。 */
export function ActionButton({
  children,
  onClick,
  disabled = false,
  primary = false,
}: {
  children: ReactNode;
  onClick(): void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={uiClasses(primary ? "button button-primary" : "button button-secondary")}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
