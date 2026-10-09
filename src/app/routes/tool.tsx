import { useEffect } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router";
import { useOptionalServices } from "../../bindings/react/services";
import { ToolMark } from "../../ui/mark";
import { uiClasses } from "../../ui/tool-ui";
import { useCatalog } from "../catalog-context";
import { ToolHost } from "../tool-host";
export default function ToolPage() {
  const { categoryLabel, findTool } = useCatalog();
  const { toolId = "" } = useParams();
  const tool = findTool(toolId);
  const services = useOptionalServices();
  const location = useLocation();
  const state: unknown = location.state;
  const returnTo =
    typeof state === "object" &&
    state !== null &&
    "returnTo" in state &&
    typeof state.returnTo === "string" &&
    state.returnTo.startsWith("/") &&
    !state.returnTo.startsWith("//")
      ? state.returnTo
      : "/";
  useEffect(() => {
    if (!tool || !services) return;
    services.recent.record(tool.id);
    services.logger.emit({ level: "info", event: "tool.open", toolId: tool.id });
    const frame = requestAnimationFrame(() => document.getElementById("tool-page-title")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [tool, services]);
  if (!tool) return <Navigate to="/" replace />;
  return (
    <main className={uiClasses("toolbox-shell tool-page-shell")}>
      <title>{`${tool.title}｜工具匣`}</title>
      <meta name="description" content={tool.summary} />
      <header className={uiClasses("site-header tool-page-site-header")}>
        <Link className={uiClasses("brand")} to="/" aria-label="工具匣首页">
          <span className={uiClasses("brand-mark")} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>工具匣</span>
        </Link>
        <Link className={uiClasses("tool-home-link")} to={returnTo} state={{ focusTool: tool.id }}>
          <span aria-hidden="true">←</span>返回全部工具
        </Link>
      </header>
      <article className={uiClasses("tool-page-main")} aria-labelledby="tool-page-title">
        <header className={uiClasses("tool-page-header")}>
          <span className={uiClasses("tool-page-kicker")}>{categoryLabel(tool.category)}</span>
          <div className={uiClasses("tool-page-title-row")}>
            <ToolMark entry={tool} />
            <div>
              <h1 id="tool-page-title" tabIndex={-1}>
                {tool.title}
              </h1>
              <p>{tool.summary}</p>
            </div>
          </div>
        </header>
        <div className={uiClasses("tool-page-content")}>
          <ToolHost key={tool.id} id={tool.id} />
        </div>
      </article>
      <footer className={uiClasses("site-footer")}>
        <span>工具匣</span>
        <p>雨寒风轻筝音悠</p>
      </footer>
    </main>
  );
}
