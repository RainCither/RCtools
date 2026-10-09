import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { useOptionalServices } from "../../bindings/react/services";
import type { CatalogEntry } from "../../contracts/catalog-schema";
import { ToolMark } from "../../ui/mark";
import { shellClasses as uiClasses } from "../../ui/shell-classes";
import { useCatalog } from "../catalog-context";
const DEFAULT_RECENT = ["json", "timestamp", "text-stats"] as const;
const noopSubscribe = () => () => {};
function ToolCard({
  entry,
  compact = false,
  returnTo,
}: {
  entry: CatalogEntry;
  compact?: boolean;
  returnTo: string;
}) {
  const { categoryLabel } = useCatalog();
  const services = useOptionalServices();
  const contents = (
    <>
      <ToolMark entry={entry} />
      <span className={uiClasses("tool-card-copy")}>
        <span className={uiClasses("tool-card-heading")}>
          <strong>{entry.title}</strong>
          <span className={uiClasses("tool-card-category")}>{categoryLabel(entry.category)}</span>
        </span>
        {!compact && <span className={uiClasses("tool-card-summary")}>{entry.summary}</span>}
      </span>
    </>
  );
  const className = uiClasses(compact ? "tool-card tool-card-compact" : "tool-card");
  if (entry.kind === "link")
    return (
      <a
        className={className}
        href={entry.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => services?.recent.record(entry.id)}
        aria-label={`访问${entry.title}（在新标签页打开）`}
      >
        {contents}
      </a>
    );
  return (
    <Link
      id={compact ? undefined : `tool-card-${entry.id}`}
      className={className}
      to={`/${entry.id}/`}
      state={{ returnTo }}
      data-tool-id={entry.id}
      aria-label={`打开${entry.title}`}
    >
      {contents}
    </Link>
  );
}
export default function HomePage() {
  const location = useLocation();
  const { categories: CATEGORIES, filterEntries, findEntry } = useCatalog();
  const services = useOptionalServices();
  const [params, setParams] = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setHydrated(true);
    const listener = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        event.key === "/" &&
        target?.tagName !== "INPUT" &&
        target?.tagName !== "TEXTAREA" &&
        !target?.isContentEditable
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const recent = useSyncExternalStore(
    services?.recent.subscribe ?? noopSubscribe,
    services?.recent.getSnapshot ?? (() => DEFAULT_RECENT),
    () => DEFAULT_RECENT,
  );
  const query = hydrated ? (params.get("q") ?? "") : "";
  const requestedCategory = hydrated ? (params.get("category") ?? "all") : "all";
  const category = CATEGORIES.some((item) => item.id === requestedCategory)
    ? requestedCategory
    : "all";
  const cards = filterEntries(query, category);
  const returnTo = `/${params.size ? `?${params.toString()}` : ""}`;
  useEffect(() => {
    const state: unknown = location.state;
    if (
      hydrated &&
      typeof state === "object" &&
      state !== null &&
      "focusTool" in state &&
      typeof state.focusTool === "string"
    )
      document.getElementById(`tool-card-${state.focusTool}`)?.focus();
  }, [hydrated, location.state]);
  function update(nextQuery: string, nextCategory: string) {
    const next = new URLSearchParams();
    if (nextQuery) next.set("q", nextQuery);
    if (nextCategory !== "all") next.set("category", nextCategory);
    setParams(next, { replace: true, preventScrollReset: true });
  }
  return (
    <main className={uiClasses("toolbox-shell")}>
      <title>工具匣｜常用小工具，一开即用</title>
      <meta name="description" content="常用小工具，一开即用。" />
      <header className={uiClasses("site-header")} id="top">
        <Link className={uiClasses("brand")} to="/" aria-label="工具匣首页">
          <span className={uiClasses("brand-mark")} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>工具匣</span>
        </Link>
        <div className={uiClasses("search-box header-search")}>
          <span className={uiClasses("search-icon")} aria-hidden="true" />
          <input
            ref={searchRef}
            id="tool-search"
            value={query}
            onChange={(event) => update(event.target.value, category)}
            aria-label="搜索工具"
            placeholder="搜索工具或功能…"
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => update("", category)} aria-label="清空搜索">
              ×
            </button>
          ) : (
            <kbd aria-label="快捷键：斜杠">/</kbd>
          )}
        </div>
      </header>
      {!query && category === "all" && (
        <section className={uiClasses("recent-section")} aria-labelledby="recent-heading">
          <div className={uiClasses("section-heading")}>
            <h2 id="recent-heading">最近使用</h2>
          </div>
          <div className={uiClasses("recent-grid")}>
            {recent
              .map((id) => findEntry(id))
              .filter((entry): entry is CatalogEntry => Boolean(entry))
              .map((entry) => (
                <ToolCard key={entry.id} entry={entry} returnTo={returnTo} compact />
              ))}
          </div>
        </section>
      )}
      <section className={uiClasses("tools-section")} aria-labelledby="tools-heading">
        <div className={uiClasses("section-heading tools-heading")}>
          <h2 id="tools-heading">全部工具</h2>
          <span>{cards.length} 个可用工具</span>
        </div>
        <nav className={uiClasses("category-tabs")} aria-label="工具分类">
          {[{ id: "all", label: "全部" }, ...CATEGORIES].map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? uiClasses("is-active") : undefined}
              aria-pressed={category === item.id}
              onClick={() => update(query, item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {cards.length ? (
          <div className={uiClasses("tool-grid")}>
            {cards.map((entry) => (
              <ToolCard key={entry.id} entry={entry} returnTo={returnTo} />
            ))}
          </div>
        ) : (
          <div className={uiClasses("empty-state")} role="status">
            <strong>没有找到匹配的工具</strong>
            <span>换个关键词，或切换到“全部”分类。</span>
            <button
              type="button"
              className={uiClasses("button button-secondary")}
              onClick={() => update("", "all")}
            >
              清除筛选
            </button>
          </div>
        )}
      </section>
      <footer className={uiClasses("site-footer")}>
        <span>工具匣</span>
        <p>雨寒风轻筝音悠</p>
      </footer>
    </main>
  );
}
