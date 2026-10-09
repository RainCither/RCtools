import type { ComponentType, ReactNode } from "react";
import { Component, useEffect, useState } from "react";
import { useOptionalServices } from "../bindings/react/services";
import type { Logger } from "../contracts/ports";
import type { AppError } from "../contracts/result";
import { failure } from "../contracts/result";
import { uiClasses } from "../ui/tool-ui";
function Loading() {
  return (
    <div className={uiClasses("tool-loading")} role="status" aria-live="polite">
      <span aria-hidden="true" />
      正在加载工具…
    </div>
  );
}
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
class ToolBoundary extends Component<
  { children: ReactNode; logger: Logger; id: string; retry(): void; copy(): void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.logger.emit({
      level: "error",
      event: "tool.render.failed",
      toolId: this.props.id,
      errorCode: "render.failed",
    });
  }
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
  const copy = () => {
    void services.clipboard.write(services.logger.diagnostics()).catch(() => {});
  };
  const retry = () => {
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
        services.drafts.delete(id);
        setAttempt((value) => value + 1);
      }}
      copy={copy}
    >
      <View />
    </ToolBoundary>
  );
}
