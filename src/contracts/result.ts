/** @file 定义成功/失败 Result、统一 AppError 和错误分类；提供错误识别、创建及归一化方法。 */
/** 区分输入、资源、执行、超时等失败边界，让界面采用对应恢复方式。 */
export type ErrorKind =
  | "validation"
  | "resource"
  | "execution"
  | "timeout"
  | "unsupported"
  | "storage"
  | "render"
  | "cancelled";
/** 跨模块传递的可序列化错误，只保存分类、编码、中文消息和可选位置。 */
export type AppError = Readonly<{
  kind: ErrorKind;
  code: string;
  message: string;
  line?: number;
  column?: number;
}>;
/** 通过 ok 区分成功值与失败错误，避免后台线程依赖异常对象的跨线程传输。 */
export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };
/** 验证 error 的分类、编码、消息和可选行列字段，返回是否符合跨模块错误协议。 */
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
/** 用 kind、code 和 message 创建统一错误对象，供边界返回可序列化失败。 */
export function failure(kind: ErrorKind, code: string, message: string): AppError {
  return { kind, code, message };
}
/** 将未知 error 分类为统一错误，保留已知错误，并区分取消、资源加载和输入校验失败。 */
export function normalizeError(error: unknown, kind: ErrorKind = "execution"): AppError {
  // 已分类的边界错误保留原信息，避免再次包装丢失恢复语义。
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
