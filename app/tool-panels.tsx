/** 管理工具模块的懒加载、预加载缓存、加载占位与失败重试。 */
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

/** 加载指定工具，并复用仍在进行中的导入请求。 */
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

/** 获取稳定的 React 懒加载组件；加载失败时允许下一次重新创建。 */
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

/** 清除指定工具的请求与组件缓存，为显式重试准备干净状态。 */
function clearToolLoad(toolId: ToolId) {
  TOOL_LOAD_PROMISES.delete(toolId);
  TOOL_COMPONENTS.delete(toolId);
}

/** 在用户可能进入工具前提前请求对应代码块。 */
export function preloadTool(toolId: ToolId) {
  void loadTool(toolId);
}

/** 工具代码块下载期间显示的可访问状态提示。 */
function ToolLoading() {
  return (
    <div className="tool-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      正在加载工具…
    </div>
  );
}

/** 工具加载失败后的错误信息与重试入口。 */
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

/** 隔离懒加载错误，并在切换工具或重试时恢复渲染。 */
class ToolLoadBoundary extends Component<
  { toolId: ToolId; children: ReactNode },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };

  /** 将子树错误转换为可渲染的失败状态。 */
  static getDerivedStateFromError() {
    return { failed: true };
  }

  /** 切换到另一工具时清除上一个工具遗留的错误状态。 */
  componentDidUpdate(previousProps: { toolId: ToolId }) {
    if (previousProps.toolId !== this.props.toolId && this.state.failed) {
      this.setState({ failed: false, attempt: 0 });
    }
  }

  /** 清缓存并递增尝试次数，强制重新挂载工具内容。 */
  handleRetry = () => {
    clearToolLoad(this.props.toolId);
    this.setState((current) => ({
      failed: false,
      attempt: current.attempt + 1,
    }));
  };

  /** 根据加载状态渲染错误提示或工具子树。 */
  render() {
    if (this.state.failed) {
      return <ToolLoadError onRetry={this.handleRetry} />;
    }

    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

/** 将指定工具组件置于 Suspense 加载边界内。 */
function ToolPanelContent({ toolId }: { toolId: ToolId }) {
  const ActiveTool = getToolComponent(toolId);

  return (
    <Suspense fallback={<ToolLoading />}>
      <ActiveTool />
    </Suspense>
  );
}

/** 为当前工具组合错误边界与异步加载边界。 */
export function ToolPanel({ toolId }: { toolId: ToolId }) {
  return (
    <ToolLoadBoundary toolId={toolId}>
      <ToolPanelContent toolId={toolId} />
    </ToolLoadBoundary>
  );
}
