import { useEffect } from "react";
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import type { ClientEvaluation } from "./controller";
import { createEvaluationController } from "./controller";
export function useRegexEvaluation(
  pattern: string,
  flags: string,
  source: string,
  replacement: string,
): { evaluation: ClientEvaluation; cancel(): void } {
  const ports = useServices();
  const { snapshot, actions } = useController(() => createEvaluationController(ports));
  useEffect(
    () => actions.update({ pattern, flags, source, replacement }),
    [pattern, flags, source, replacement, actions],
  );
  let evaluation: ClientEvaluation;
  if (!pattern) evaluation = { status: "idle", matches: [], truncated: false };
  else if (snapshot.status === "cancelled") evaluation = { status: "cancelled" };
  else if (
    snapshot.draft.pattern !== pattern ||
    snapshot.draft.flags !== flags ||
    snapshot.draft.source !== source ||
    snapshot.draft.replacement !== replacement ||
    snapshot.status === "pending" ||
    snapshot.status === "running"
  )
    evaluation = { status: "running" };
  else if (snapshot.error?.kind === "validation")
    evaluation = { status: "error", error: snapshot.error.message, matches: [], truncated: false };
  else if (snapshot.error)
    evaluation = {
      status: snapshot.error.kind === "timeout" ? "timeout" : "unavailable",
      error: snapshot.error.message,
    };
  else evaluation = snapshot.output;
  return { evaluation, cancel: actions.cancel };
}
