/** @file 工具页面加载和错误处理边界。按 ID 延迟加载视图，显示加载状态，处理导入或渲染失败，并提供重试、重置和诊断复制。 */
import type { ComponentType, ReactNode } from "react";
import { Component, useEffect, useState } from "react";
import { useOptionalServices } from "../bindings/react/services";
import type { Logger } from "../contracts/ports";
import type { AppError } from "../contracts/result";
import { failure } from "../contracts/result";
import { uiClasses } from "../ui/tool-ui";
/** 渲染可被辅助技术播报的工具加载占位，让静态页面和异步加载阶段共用状态。 */
function Loading() {
  return (
    <div className={uiClasses("tool-loading")} role="status" aria-live="polite">
      <span aria-hidden="true" />
      正在加载工具…
    </div>
  );
}
/** 展示 message 以及 retry、copy 恢复操作，使资源加载或渲染失败有明确处理入口。 */
function ErrorPanel({
  message,
  retry,
  copy,
  retryLabel = "重试",
}: {
  message: string;
  retry(): void;
  copy(): void;
  retryLabel?: string;
}) {
  return (
    <div className={uiClasses("tool-load-error")} role="alert">
      <strong>{message}</strong>
      <div className={uiClasses("tool-actions")}>
        <button type="button" className={uiClasses("button button-secondary")} onClick={retry}>
          {retryLabel}
        </button>
        <button type="button" className={uiClasses("button button-secondary")} onClick={copy}>
          复制诊断信息
        </button>
      </div>
    </div>
  );
}
/** 隔离单个工具的渲染故障，记录诊断并允许重建组件实例，不影响目录和其他工具。 */
class ToolBoundary extends Component<
  { children: ReactNode; logger: Logger; id: string; retry(): void; copy(): void },
  { error: boolean }
> {
  state = { error: false };
  /** 捕获子组件渲染异常并切换到错误面板，隔离当前工具的界面故障。 */
  static getDerivedStateFromError() {
    return { error: true };
  }
  /** 将当前工具的渲染失败记录为结构化事件，便于诊断且避免携带异常堆栈。 */
  componentDidCatch() {
    this.props.logger.emit({
      level: "error",
      event: "tool.render.failed",
      toolId: this.props.id,
      errorCode: "render.failed",
    });
  }
  /** 依据错误状态返回工具内容或恢复面板，重置由拥有者更换边界实例完成。 */
  render() {
    return this.state.error ? (
      <ErrorPanel
        message="工具界面发生异常，请重置后重试。"
        retryLabel="重置工具"
        retry={this.props.retry}
        copy={this.props.copy}
      />
    ) : (
      this.props.children
    );
  }
}
/** 根据 id 延迟加载工具视图，管理加载和渲染错误边界，提供重试、重置与诊断复制。 */
export function ToolHost({ id }: { id: string }) {
  const services = useOptionalServices();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{
    id: string;
    view: ComponentType | null;
    error: AppError | null;
  }>({ id, view: null, error: null });
  useEffect(() => {
    if (!services) return;
    // 切换工具或重试会使旧加载失效，Promise 完成后只更新仍激活的宿主。
    let active = true;
    setLoaded({ id, view: null, error: null });
    void services.modules.load(id).then(
      (module) => {
        if (active) setLoaded({ id, view: module.default, error: null });
      },
      () => {
        if (active) {
          services.logger.emit({
            level: "error",
            event: "module.load.failed",
            toolId: id,
            errorCode: "module.load",
          });
          setLoaded({
            id,
            view: null,
            error: failure("resource", "module.load", "工具资源加载失败，请重试。"),
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [id, attempt, services]);
  if (!services || loaded.id !== id) return <Loading />;
  /** 复制当前运行服务的白名单诊断信息，复制失败由剪贴板能力记录。 */
  const copy = () => {
    void services.clipboard.write(services.logger.diagnostics()).catch(() => {});
  };
  /** 先重置模块缓存进行一次重试，再交由用户刷新处理浏览器可能缓存的失败模块。 */
  const retry = () => {
    // 浏览器可能保留失败的原生模块状态，有限重试后由用户刷新而非自动循环。
    if (attempt >= 1) {
      window.location.reload();
      return;
    }
    services.modules.reset(id);
    setAttempt((value) => value + 1);
  };
  if (loaded.error)
    return (
      <ErrorPanel
        message={attempt ? "资源仍未能加载，请刷新页面后重试。" : loaded.error.message}
        retryLabel={attempt ? "刷新页面" : "重试"}
        retry={retry}
        copy={copy}
      />
    );
  const View = loaded.view;
  if (!View) return <Loading />;
  return (
    <ToolBoundary
      key={`${id}:${attempt}`}
      id={id}
      logger={services.logger}
      retry={() => {
        // 渲染故障重置时清除该工具草稿，并更换边界实例以重新创建控制器。
        services.drafts.delete(id);
        setAttempt((value) => value + 1);
      }}
      copy={copy}
    >
      <View />
    </ToolBoundary>
  );
}
