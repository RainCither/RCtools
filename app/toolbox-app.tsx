import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { getPageHref } from "./app-routes";
import { EXTERNAL_LINKS, type ExternalLinkDefinition } from "./external-links";
import { PAGE_METADATA, type PageMetadata } from "./pages/page-metadata";
import { preloadTool, ToolPanel } from "./tool-panels";
import {
  DEFAULT_RECENT,
  findTool,
  isToolId,
  TOOL_CATEGORIES,
  TOOLS,
  type CategoryFilter,
  type RegisteredTool,
  type ToolId,
} from "./tool-registry";
import { TOOL_CATEGORY_LABELS, type ToolCategory } from "./tool-types";
import {
  getHomeHref,
  getToolHref,
  normalizeBasePath,
  parseToolRoute,
} from "./tool-routes";

const RECENT_STORAGE_KEY = "toolbox:recent:v1";
const HOVER_PRELOAD_DELAY = 120;
const HOME_TITLE = "工具匣｜常用小工具，一开即用";
const HOME_DESCRIPTION = "一个简洁、快速、可持续扩展的个人工具站。";
type PageCardDefinition = {
  id: string;
  pageId: string;
  title: string;
  summary: string;
  category: ToolCategory;
  categoryLabel: (typeof TOOL_CATEGORY_LABELS)[ToolCategory];
  mark: string;
  searchTerms: readonly string[];
};
type HomeCardDefinition =
  RegisteredTool | PageCardDefinition | ExternalLinkDefinition;
const PAGE_CARDS: readonly PageCardDefinition[] = (
  PAGE_METADATA as readonly PageMetadata[]
).flatMap((page) => {
  const homeCard = page.homeCard;
  if (!homeCard) return [];

  return [
    {
      id: page.id,
      pageId: page.id,
      title: page.title,
      summary: page.description,
      category: homeCard.category,
      categoryLabel: TOOL_CATEGORY_LABELS[homeCard.category],
      mark: homeCard.mark,
      searchTerms: homeCard.searchTerms,
    },
  ];
});
const HOME_CARDS: readonly HomeCardDefinition[] = [
  ...TOOLS,
  ...PAGE_CARDS,
  ...EXTERNAL_LINKS,
];
const HOME_CARD_BY_ID: ReadonlyMap<string, HomeCardDefinition> = new Map(
  HOME_CARDS.map((card) => [card.id, card]),
);

type NavigateHandler = (
  event: MouseEvent<HTMLAnchorElement>,
  toolId: ToolId | null,
) => void;
type RecordRecentHandler = (cardId: string) => void;

function findHomeCard(cardId: string): HomeCardDefinition | undefined {
  return HOME_CARD_BY_ID.get(cardId);
}

function isExternalLinkCard(
  card: HomeCardDefinition,
): card is ExternalLinkDefinition {
  return "href" in card;
}

function isPageCard(
  card: HomeCardDefinition,
): card is PageCardDefinition {
  return "pageId" in card;
}

function isRegisteredToolCard(
  card: HomeCardDefinition,
): card is RegisteredTool {
  return !isExternalLinkCard(card) && !isPageCard(card);
}

function isPlainNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function SiteBrand({
  href,
  onNavigate,
}: {
  href: string;
  onNavigate?: NavigateHandler;
}) {
  return (
    <a
      className="brand"
      href={href}
      onClick={onNavigate ? (event) => onNavigate(event, null) : undefined}
      aria-label="工具匣首页"
    >
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>工具匣</span>
    </a>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>工具匣</span>
      <p>雨寒风轻筝音悠</p>
    </footer>
  );
}

function ToolCard({
  card,
  basePath,
  compact = false,
  onNavigate,
  onRecordRecent,
}: {
  card: HomeCardDefinition;
  basePath: string;
  compact?: boolean;
  onNavigate: NavigateHandler;
  onRecordRecent: RecordRecentHandler;
}) {
  const preloadTimerRef = useRef<number | null>(null);
  const externalLink = isExternalLinkCard(card) ? card : null;
  const pageCard = isPageCard(card) ? card : null;
  const internalTool = isRegisteredToolCard(card) ? card : null;
  const opensNewTab = Boolean(externalLink || pageCard);
  const href =
    externalLink?.href ??
    (pageCard
      ? getPageHref(pageCard.pageId, basePath)
      : getToolHref(card.id, basePath));

  function cancelScheduledPreload() {
    if (preloadTimerRef.current === null) return;
    window.clearTimeout(preloadTimerRef.current);
    preloadTimerRef.current = null;
  }

  function schedulePreload() {
    if (!internalTool) return;
    cancelScheduledPreload();
    preloadTimerRef.current = window.setTimeout(() => {
      preloadTimerRef.current = null;
      preloadTool(internalTool.id);
    }, HOVER_PRELOAD_DELAY);
  }

  useEffect(
    () => () => {
      if (preloadTimerRef.current !== null) {
        window.clearTimeout(preloadTimerRef.current);
      }
    },
    [],
  );

  return (
    <a
      className={compact ? "tool-card tool-card-compact" : "tool-card"}
      href={href}
      target={opensNewTab ? "_blank" : undefined}
      rel={opensNewTab ? "noopener noreferrer" : undefined}
      onPointerEnter={
        internalTool
          ? (event) => {
              if (
                event.pointerType === "mouse" ||
                event.pointerType === "pen"
              ) {
                schedulePreload();
              }
            }
          : undefined
      }
      onPointerLeave={internalTool ? cancelScheduledPreload : undefined}
      onFocus={
        internalTool
          ? () => {
              cancelScheduledPreload();
              preloadTool(internalTool.id);
            }
          : undefined
      }
      onClick={
        internalTool
          ? (event) => onNavigate(event, internalTool.id)
          : () => onRecordRecent(card.id)
      }
      aria-label={
        opensNewTab
          ? `访问${card.title}（在新标签页打开）`
          : `打开${card.title}`
      }
    >
      <span className={`tool-mark tool-mark-${card.id}`} aria-hidden="true">
        {card.mark}
      </span>
      <span className="tool-card-copy">
        <span className="tool-card-heading">
          <strong>{card.title}</strong>
          <span className="tool-card-category">{card.categoryLabel}</span>
        </span>
        {compact ? null : (
          <span className="tool-card-summary">{card.summary}</span>
        )}
      </span>
    </a>
  );
}

function ToolboxHome({
  basePath,
  recent,
  onNavigate,
  onRecordRecent,
}: {
  basePath: string;
  recent: string[];
  onNavigate: NavigateHandler;
  onRecordRecent: RecordRecentHandler;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filteredCards = useMemo(() => {
    const search = deferredQuery.trim().toLocaleLowerCase("zh-CN");
    return HOME_CARDS.filter((card) => {
      const inCategory = category === "all" || card.category === category;
      const searchable = [card.title, card.summary, ...card.searchTerms]
        .join(" ")
        .toLocaleLowerCase("zh-CN");
      return inCategory && (!search || searchable.includes(search));
    });
  }, [category, deferredQuery]);

  const recentCards = useMemo(
    () =>
      recent
        .map((cardId) => findHomeCard(cardId))
        .filter((card): card is HomeCardDefinition => Boolean(card)),
    [recent],
  );

  return (
    <main className="toolbox-shell">
      <header className="site-header" id="top">
        <SiteBrand href="#top" />

        <div className="search-box header-search">
          <span className="search-icon" aria-hidden="true" />
          <input
            ref={searchRef}
            id="tool-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="搜索工具"
            placeholder="搜索工具或功能…"
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="清空搜索"
            >
              ×
            </button>
          ) : (
            <kbd aria-label="快捷键：斜杠">/</kbd>
          )}
        </div>
      </header>

      {!query && category === "all" ? (
        <section className="recent-section" aria-labelledby="recent-heading">
          <div className="section-heading">
            <div>
              <h2 id="recent-heading">最近使用</h2>
            </div>
          </div>
          <div className="recent-grid">
            {recentCards.map((card) => (
              <ToolCard
                key={card.id}
                card={card}
                basePath={basePath}
                compact
                onNavigate={onNavigate}
                onRecordRecent={onRecordRecent}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="tools-section" aria-labelledby="tools-heading">
        <div className="section-heading tools-heading">
          <div>
            <h2 id="tools-heading">全部工具</h2>
          </div>
          <span>{filteredCards.length} 个可用工具</span>
        </div>

        <nav className="category-tabs" aria-label="工具分类">
          {TOOL_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? "is-active" : undefined}
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {filteredCards.length ? (
          <div className="tool-grid">
            {filteredCards.map((card) => (
              <ToolCard
                key={card.id}
                card={card}
                basePath={basePath}
                onNavigate={onNavigate}
                onRecordRecent={onRecordRecent}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <strong>没有找到匹配的工具</strong>
            <span>换个关键词，或切换到“全部”分类。</span>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              清除筛选
            </button>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

function ToolPage({
  toolId,
  basePath,
  onNavigate,
}: {
  toolId: ToolId;
  basePath: string;
  onNavigate: NavigateHandler;
}) {
  const tool = findTool(toolId);
  if (!tool) return null;

  const homeHref = getHomeHref(basePath);

  return (
    <main className="toolbox-shell tool-page-shell">
      <header className="site-header tool-page-site-header">
        <SiteBrand href={homeHref} onNavigate={onNavigate} />
        <a
          className="tool-home-link"
          href={homeHref}
          onClick={(event) => onNavigate(event, null)}
        >
          <span aria-hidden="true">←</span>
          返回全部工具
        </a>
      </header>

      <article className="tool-page-main" aria-labelledby="tool-page-title">
        <header className="tool-page-header">
          <span className="tool-page-kicker">{tool.categoryLabel}</span>
          <div className="tool-page-title-row">
            <span
              className={`tool-mark tool-mark-${tool.id}`}
              aria-hidden="true"
            >
              {tool.mark}
            </span>
            <div>
              <h1 id="tool-page-title" tabIndex={-1}>
                {tool.title}
              </h1>
              <p>{tool.summary}</p>
            </div>
          </div>
        </header>

        <div className="tool-page-content">
          <ToolPanel toolId={toolId} />
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}

export function ToolboxApp({
  initialToolId = null,
  basePath = "/",
}: {
  initialToolId?: ToolId | null;
  basePath?: string;
}) {
  const normalizedBasePath = useMemo(
    () => normalizeBasePath(basePath),
    [basePath],
  );
  const [activeTool, setActiveTool] = useState<ToolId | null>(initialToolId);
  const [recent, setRecent] = useState<string[]>(DEFAULT_RECENT);

  const recordRecent = useCallback((cardId: string) => {
    setRecent((current) => {
      const next = [cardId, ...current.filter((item) => item !== cardId)].slice(
        0,
        3,
      );
      try {
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable in private browsing or blocked contexts.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : null;
      const safeIds = Array.isArray(parsed)
        ? parsed.filter(
            (value): value is string =>
              typeof value === "string" && HOME_CARD_BY_ID.has(value),
          )
        : DEFAULT_RECENT;
      const next = initialToolId
        ? [initialToolId, ...safeIds.filter((item) => item !== initialToolId)]
        : safeIds;
      const trimmed = next.slice(0, 3);
      if (trimmed.length) setRecent(trimmed);
      if (initialToolId) {
        window.localStorage.setItem(
          RECENT_STORAGE_KEY,
          JSON.stringify(trimmed),
        );
      }
    } catch {
      if (initialToolId) recordRecent(initialToolId);
    }
  }, [initialToolId, recordRecent]);

  useEffect(() => {
    const tool = activeTool ? findTool(activeTool) : null;
    document.title = tool ? `${tool.title}｜工具匣` : HOME_TITLE;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description) {
      description.content = tool?.summary ?? HOME_DESCRIPTION;
    }
  }, [activeTool]);

  useEffect(() => {
    function handlePopState() {
      const route = parseToolRoute(
        window.location.pathname,
        normalizedBasePath,
        isToolId,
      );

      if (route.kind === "invalid") {
        window.location.replace(getHomeHref(normalizedBasePath));
        return;
      }

      const toolId = route.kind === "tool" ? route.toolId : null;
      setActiveTool(toolId);
      if (toolId) recordRecent(toolId);
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [normalizedBasePath, recordRecent]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (activeTool) {
      window.requestAnimationFrame(() => {
        document.getElementById("tool-page-title")?.focus();
      });
    }
  }, [activeTool]);

  const handleNavigate = useCallback<NavigateHandler>(
    (event, toolId) => {
      if (!isPlainNavigation(event)) return;

      event.preventDefault();
      const href = toolId
        ? getToolHref(toolId, normalizedBasePath)
        : getHomeHref(normalizedBasePath);

      if (window.location.pathname !== href) {
        window.history.pushState({ toolId }, "", href);
      }
      setActiveTool(toolId);
      if (toolId) recordRecent(toolId);
    },
    [normalizedBasePath, recordRecent],
  );

  return activeTool ? (
    <ToolPage
      toolId={activeTool}
      basePath={normalizedBasePath}
      onNavigate={handleNavigate}
    />
  ) : (
    <ToolboxHome
      basePath={normalizedBasePath}
      recent={recent}
      onNavigate={handleNavigate}
      onRecordRecent={recordRecent}
    />
  );
}
