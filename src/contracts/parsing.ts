import type { AppError } from "./result";
import { isAppError, normalizeError } from "./result";
function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
/** Parser locations are useful; source excerpts and library messages are not UI contracts. */
export function parserFailure(cause: unknown, namespace: string, input?: string): AppError {
  if (isAppError(cause)) return cause;
  const normalized = normalizeError(cause);
  if (normalized.kind === "resource") return normalized;
  const details = object(cause);
  const loc = object(details.loc);
  const start = object(loc.start);
  let line = start.line ?? loc.line ?? details.line;
  let column = start.column ?? loc.column ?? details.column;
  if (typeof details.col === "number") column = details.col + 1;
  const message = cause instanceof Error ? cause.message : "";
  if (
    !(cause instanceof SyntaxError) &&
    typeof line !== "number" &&
    !/syntax|unexpected|parse|语法|解析/i.test(message)
  )
    return normalized;
  const position = /(?:position|位置)\s+(\d+)/i.exec(message)?.[1];
  const messageLocation = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  if (messageLocation) {
    line = Number(messageLocation[1]);
    column = Number(messageLocation[2]);
  }
  if (input !== undefined && position !== undefined) {
    const prefix = input.slice(0, Number(position));
    line = prefix.split("\n").length;
    column = prefix.length - prefix.lastIndexOf("\n");
  }
  const parsedLine = typeof line === "number" && Number.isFinite(line) ? line : undefined;
  const parsedColumn = typeof column === "number" && Number.isFinite(column) ? column : undefined;
  return {
    kind: "validation",
    code: `${namespace}.syntax`,
    message: `${namespace === "js-formatter" ? "JavaScript" : namespace === "css-formatter" ? "CSS" : namespace === "html-formatter" ? "HTML" : "JSON"} 语法无效${parsedLine ? `（第 ${parsedLine} 行${parsedColumn ? `，第 ${parsedColumn} 列` : ""}）` : ""}，请检查输入后重试。`,
    ...(parsedLine ? { line: parsedLine } : {}),
    ...(parsedColumn ? { column: parsedColumn } : {}),
  };
}
