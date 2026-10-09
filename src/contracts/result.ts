export type ErrorKind =
  | "validation"
  | "resource"
  | "execution"
  | "timeout"
  | "unsupported"
  | "storage"
  | "render"
  | "cancelled";
export type AppError = Readonly<{
  kind: ErrorKind;
  code: string;
  message: string;
  line?: number;
  column?: number;
}>;
export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };
export function isAppError(error: unknown): error is AppError {
  if (
    typeof error !== "object" ||
    error === null ||
    !("kind" in error) ||
    !("code" in error) ||
    !("message" in error)
  )
    return false;
  return (
    typeof error.kind === "string" &&
    [
      "validation",
      "resource",
      "execution",
      "timeout",
      "unsupported",
      "storage",
      "render",
      "cancelled",
    ].includes(error.kind) &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    (!("line" in error) ||
      (typeof error.line === "number" && Number.isInteger(error.line) && error.line > 0)) &&
    (!("column" in error) ||
      (typeof error.column === "number" && Number.isInteger(error.column) && error.column > 0))
  );
}
export function failure(kind: ErrorKind, code: string, message: string): AppError {
  return { kind, code, message };
}
export function normalizeError(error: unknown, kind: ErrorKind = "execution"): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error && error.name === "AbortError")
    return failure("cancelled", "task.cancelled", "已取消。");
  if (
    error instanceof Error &&
    /failed to fetch|dynamically imported|importing a module|networkerror|loading chunk/i.test(
      error.message,
    )
  )
    return failure("resource", "module.load", "所需资源未能加载，请重试。");
  const message = error instanceof Error ? error.message : "处理失败，请稍后重试。";
  if (
    error instanceof SyntaxError ||
    /语法无效|请输入|内容无效|不能为空|不能超过|请至少|没有可用/.test(message)
  )
    kind = "validation";
  return failure(
    kind,
    `${kind}.failed`,
    kind === "validation" ? message : "处理失败，请重新执行或调整输入。",
  );
}
