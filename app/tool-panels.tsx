"use client";

import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import type { ToolId } from "./tool-registry";

const TOOL_COMPONENTS: Record<
  ToolId,
  LazyExoticComponent<ComponentType>
> = {
  json: lazy(() =>
    import("./tools/json-tool").then(({ JsonTool }) => ({ default: JsonTool })),
  ),
  timestamp: lazy(() =>
    import("./tools/timestamp-tool").then(({ TimestampTool }) => ({
      default: TimestampTool,
    })),
  ),
  "text-stats": lazy(() =>
    import("./tools/text-stats-tool").then(({ TextStatsTool }) => ({
      default: TextStatsTool,
    })),
  ),
  password: lazy(() =>
    import("./tools/password-tool").then(({ PasswordTool }) => ({
      default: PasswordTool,
    })),
  ),
  base64: lazy(() =>
    import("./tools/base64-tool").then(({ Base64Tool }) => ({
      default: Base64Tool,
    })),
  ),
  color: lazy(() =>
    import("./tools/color-tool").then(({ ColorTool }) => ({
      default: ColorTool,
    })),
  ),
};

function ToolLoading() {
  return (
    <div className="tool-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      正在加载工具…
    </div>
  );
}

export function ToolPanel({ toolId }: { toolId: ToolId }) {
  const ActiveTool = TOOL_COMPONENTS[toolId];

  return (
    <Suspense fallback={<ToolLoading />}>
      <ActiveTool />
    </Suspense>
  );
}
