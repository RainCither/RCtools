import type { ReactNode } from "react";
import styles from "./toolbox.module.css";
import { shellClasses } from "./shell-classes";
export function uiClasses(value: string) {
  return value
    .split(/\s+/)
    .map((name) => `${shellClasses(name)} ${styles[name] ?? ""}`)
    .join(" ");
}
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
