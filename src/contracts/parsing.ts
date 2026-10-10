/** @file 将 JSON/CSS/JavaScript/HTML 解析器异常转换为统一中文提示，提取可用行列信息，并保留资源加载失败分类。 */
import type { AppError } from "./result";
import { isAppError, normalizeError } from "./result";
/** 将 value 收窄为可读取属性的对象，无法识别的值返回空对象供错误位置解析使用。 */
function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
/** 将 cause 转为 namespace 对应的中文解析错误；input 仅用于换算行列，返回值不携带源码摘录。 */
export function parserFailure(cause: unknown, namespace: string, input?: string): AppError {
  if (isAppError(cause)) return cause;
  const normalized = normalizeError(cause);
  // 资源下载失败属于可重试加载问题，不能被包装成用户输入的语法错误。
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
  // 把解析器的字符偏移换成行列，输入只用于定位，不拼入用户提示。
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
