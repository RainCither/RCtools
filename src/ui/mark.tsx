import type { CSSProperties } from "react";
import type { CatalogEntry } from "../contracts/catalog-schema";
import { shellClasses as uiClasses } from "./shell-classes";
const colors = {
  accent: ["var(--accent-soft)", "var(--accent-dark)"],
  blue: ["#edf3ff", "#46679e"],
  green: ["#eef7eb", "#497440"],
  purple: ["#f0edff", "#6651a7"],
  yellow: ["#fff5dc", "#8c6921"],
  teal: ["#e9f7f6", "#397b76"],
} as const;
export function ToolMark({ entry }: { entry: CatalogEntry }) {
  const appearance = entry.appearance;
  const [background, color] = colors[appearance.tone];
  const style: CSSProperties = {
    background,
    color,
    fontSize: appearance.size,
    fontFamily: appearance.font === "serif" ? "Georgia, serif" : "var(--font-mono)",
  };
  return (
    <span className={uiClasses("tool-mark")} aria-hidden="true" style={style}>
      {entry.mark}
    </span>
  );
}
