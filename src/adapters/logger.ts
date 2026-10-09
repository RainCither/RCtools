import type { ClockPort, LogEvent, LogInput, Logger } from "../contracts/ports";
export function createLogger(
  clock: ClockPort,
  buildId: string,
  sessionId: string,
  development = false,
): Logger {
  const events: LogEvent[] = [];
  return {
    emit(input: LogInput) {
      try {
        if (!development && input.level === "debug") return;
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
        /* Diagnostics never interrupt a tool. */
      }
    },
    diagnostics: () => JSON.stringify(events, null, 2),
  };
}
