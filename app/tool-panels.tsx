"use client";

import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { TOOLS, type ToolId } from "./tool-registry";
import type { ToolLoader } from "./tool-types";

const TOOL_LOADERS = Object.fromEntries(
  TOOLS.map((tool) => [tool.id, tool.load]),
) as Record<ToolId, ToolLoader>;

const TOOL_LOAD_PROMISES = new Map<ToolId, ReturnType<ToolLoader>>();

function loadTool(toolId: ToolId) {
  const cached = TOOL_LOAD_PROMISES.get(toolId);
  if (cached) return cached;

  const pending = TOOL_LOADERS[toolId]();
  TOOL_LOAD_PROMISES.set(toolId, pending);
  void pending.catch(() => {
    if (TOOL_LOAD_PROMISES.get(toolId) === pending) {
      TOOL_LOAD_PROMISES.delete(toolId);
    }
  });
  return pending;
}

const TOOL_COMPONENTS = Object.fromEntries(
  TOOLS.map((tool) => [tool.id, lazy(() => loadTool(tool.id))]),
) as Record<ToolId, LazyExoticComponent<ComponentType>>;

export function preloadTool(toolId: ToolId) {
  void loadTool(toolId);
}

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
