/** @file 保存白名单诊断事件，附加时间、构建和会话标识，最多保留 500 条；开发时输出控制台日志，并支持导出诊断 JSON。 */
import type { ClockPort, LogEvent, LogInput, Logger } from "../contracts/ports";
/** 使用 clock、buildId 和 sessionId 建立诊断缓冲，返回事件记录与导出方法。 */
export function createLogger(
  clock: ClockPort,
  buildId: string,
  sessionId: string,
  development = false,
): Logger {
  const events: LogEvent[] = [];
  return {
    /** 仅记录批准的诊断字段并维护缓冲上限，使工具输入和资源内容留在业务边界内。 */
    emit(input: LogInput) {
      try {
        if (!development && input.level === "debug") return;
        // 逐项复制批准字段，避免调用方额外属性把输入、文件名或堆栈带入诊断。
        const event: LogEvent = {
          timestamp: new Date(clock.now()).toISOString(),
          buildId,
          sessionId,
          level: input.level,
          event: input.event,
          ...(input.toolId !== undefined ? { toolId: input.toolId } : {}),
          ...(input.operation !== undefined ? { operation: input.operation } : {}),
          ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
          ...(input.phase !== undefined ? { phase: input.phase } : {}),
          ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
          ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
        };
        events.push(Object.freeze(event));
        if (events.length > 500) events.shift();
        if (development) console.info("[RCtools]", event);
      } catch {
        /* 诊断记录失败时保留工具操作流程，避免日志成为新的故障来源。 */
      }
    },
    /** 将保留的白名单事件序列化为诊断文字，供用户主动复制排查问题。 */
    diagnostics: () => JSON.stringify(events, null, 2),
  };
}
