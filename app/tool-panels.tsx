"use client";

import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
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

const TOOL_COMPONENTS = new Map<
  ToolId,
  LazyExoticComponent<ComponentType>
>();

function getToolComponent(toolId: ToolId) {
  const cached = TOOL_COMPONENTS.get(toolId);
  if (cached) return cached;

  const component = lazy(async () => {
    try {
      return await loadTool(toolId);
    } catch (error) {
      TOOL_COMPONENTS.delete(toolId);
      throw error;
    }
  });
  TOOL_COMPONENTS.set(toolId, component);
  return component;
}

function clearToolLoad(toolId: ToolId) {
  TOOL_LOAD_PROMISES.delete(toolId);
  TOOL_COMPONENTS.delete(toolId);
}

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

function ToolLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="tool-load-error" role="alert">
      <strong>工具加载失败</strong>
      <span>请检查网络连接后重试。</span>
      <button className="button button-secondary" type="button" onClick={onRetry}>
        重新加载
      </button>
    </div>
  );
}

class ToolLoadBoundary extends Component<
  { toolId: ToolId; children: ReactNode },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps: { toolId: ToolId }) {
    if (previousProps.toolId !== this.props.toolId && this.state.failed) {
      this.setState({ failed: false, attempt: 0 });
    }
  }

  handleRetry = () => {
    clearToolLoad(this.props.toolId);
    this.setState((current) => ({
      failed: false,
      attempt: current.attempt + 1,
    }));
  };

  render() {
    if (this.state.failed) {
      return <ToolLoadError onRetry={this.handleRetry} />;
    }

    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

function ToolPanelContent({ toolId }: { toolId: ToolId }) {
  const ActiveTool = getToolComponent(toolId);

  return (
    <Suspense fallback={<ToolLoading />}>
      <ActiveTool />
    </Suspense>
  );
}

export function ToolPanel({ toolId }: { toolId: ToolId }) {
  return (
    <ToolLoadBoundary toolId={toolId}>
      <ToolPanelContent toolId={toolId} />
    </ToolLoadBoundary>
  );
}
