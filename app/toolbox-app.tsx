"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ToolPanel } from "./tool-panels";
import {
  DEFAULT_RECENT,
  findTool,
  TOOL_CATEGORIES,
  TOOLS,
  type CategoryFilter,
  type ToolDefinition,
  type ToolId,
} from "./tool-registry";

const RECENT_STORAGE_KEY = "toolbox:recent:v1";

function ToolCard({
  tool,
  compact = false,
  onOpen,
}: {
  tool: ToolDefinition;
  compact?: boolean;
  onOpen: (toolId: ToolId) => void;
}) {
  return (
    <button
      className={compact ? "tool-card tool-card-compact" : "tool-card"}
      type="button"
      onClick={() => onOpen(tool.id)}
      aria-label={`打开${tool.title}`}
    >
      <span className={`tool-mark tool-mark-${tool.id}`} aria-hidden="true">
        {tool.mark}
      </span>
      <span className="tool-card-copy">
        <span className="tool-card-heading">
          <strong>{tool.title}</strong>
          <span className="tool-card-category">{tool.categoryLabel}</span>
        </span>
        {compact ? null : <span className="tool-card-summary">{tool.summary}</span>}
      </span>
    </button>
  );
}

function ToolDialog({
  open,
  toolId,
  onRequestClose,
}: {
  open: boolean;
  toolId: ToolId | null;
  onRequestClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tool = toolId ? findTool(toolId) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="tool-dialog"
      aria-labelledby="tool-dialog-title"
      aria-describedby="tool-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
      onClose={onRequestClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onRequestClose();
      }}
    >
      <div className="dialog-panel">
        <header className="dialog-header">
          <div>
            <span className="dialog-kicker">{tool?.categoryLabel}</span>
            <h2 id="tool-dialog-title">{tool?.title}</h2>
            <p id="tool-dialog-description">{tool?.summary}</p>
          </div>
          <button className="dialog-close" type="button" onClick={onRequestClose} aria-label="关闭窗口">
            ×
          </button>
        </header>

        <div className="dialog-content">
          {toolId ? <ToolPanel toolId={toolId} /> : null}
        </div>
      </div>
    </dialog>
  );
}

export function ToolboxApp() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [recent, setRecent] = useState<ToolId[]>(DEFAULT_RECENT);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_STORAGE_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      const validIds = new Set(TOOLS.map((tool) => tool.id));
      const safeIds = parsed.filter((value): value is ToolId =>
        typeof value === "string" && validIds.has(value as ToolId),
      );
      if (safeIds.length) setRecent(safeIds.slice(0, 3));
    } catch {
      // Ignore invalid device-local history and keep the useful defaults.
    }
  }, []);

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

  const filteredTools = useMemo(() => {
    const search = deferredQuery.trim().toLocaleLowerCase("zh-CN");
    return TOOLS.filter((tool) => {
      const inCategory = category === "all" || tool.category === category;
      const searchable = [tool.title, tool.summary, ...tool.searchTerms]
        .join(" ")
        .toLocaleLowerCase("zh-CN");
      return inCategory && (!search || searchable.includes(search));
    });
  }, [category, deferredQuery]);

  const recentTools = useMemo(
    () => recent.map((toolId) => findTool(toolId)).filter((tool): tool is ToolDefinition => Boolean(tool)),
    [recent],
  );

  function openTool(toolId: ToolId) {
    setActiveTool(toolId);
    setRecent((current) => {
      const next = [toolId, ...current.filter((item) => item !== toolId)].slice(0, 3);
      try {
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable in private browsing or blocked contexts.
      }
      return next;
    });
  }

  function closeDialog() {
    setActiveTool(null);
  }

  return (
    <main className="toolbox-shell">
      <header className="site-header" id="top">
        <a className="brand" href="#top" aria-label="工具匣首页">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>工具匣</span>
        </a>

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
            <button type="button" onClick={() => setQuery("")} aria-label="清空搜索">×</button>
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
            {recentTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} compact onOpen={openTool} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="tools-section" aria-labelledby="tools-heading">
        <div className="section-heading tools-heading">
          <div>
            <h2 id="tools-heading">全部工具</h2>
          </div>
          <span>{filteredTools.length} 个可用工具</span>
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

        {filteredTools.length ? (
          <div className="tool-grid">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onOpen={openTool} />
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <strong>没有找到匹配的工具</strong>
            <span>换个关键词，或切换到“全部”分类。</span>
            <button className="button button-secondary" type="button" onClick={() => { setQuery(""); setCategory("all"); }}>
              清除筛选
            </button>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>工具匣</span>
        <p>本地处理 · 无需上传 · 持续扩展</p>
      </footer>

      <ToolDialog
        open={Boolean(activeTool)}
        toolId={activeTool}
        onRequestClose={closeDialog}
      />
    </main>
  );
}
