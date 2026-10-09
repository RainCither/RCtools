/** 将当前输入与异步结果绑定，输入变化的同一帧立即隐藏过期结果。 */
import { useEffect, useMemo, useState } from "react";
import {
  createRegexRunner,
  type RegexClientEvaluation,
  type RegexInput,
} from "./regex-runner";

export function useRegexEvaluation(
  pattern: string, flags: string, source: string, replacement: string,
): RegexClientEvaluation {
  const input = useMemo<RegexInput>(
    () => ({ pattern, flags, source, replacement }),
    [pattern, flags, source, replacement],
  );
  const [snapshot, setSnapshot] = useState<{
    input: RegexInput; result: RegexClientEvaluation;
  } | null>(null);
  const runner = useMemo(() => createRegexRunner(
    () => new Worker(new URL("./regex.worker.ts", import.meta.url), { type: "module" }),
    (nextInput, result) => setSnapshot({ input: nextInput, result }),
  ), []);

  useEffect(() => {
    runner.submit(input);
    return () => runner.cancel();
  }, [input, runner]);

  if (!pattern) return { status: "idle", matches: [], truncated: false };
  return snapshot?.input === input ? snapshot.result : { status: "running" };
}
