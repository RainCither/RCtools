import { createRoot } from "react-dom/client";
import "./globals.css";
import { getHomeHref, parseAppRoute } from "./app-routes";
import { PagePanel } from "./pages/page-panel";
import { findPage, isPageId } from "./pages/page-registry";
import { ToolboxApp } from "./toolbox-app";
import { isToolId } from "./tool-registry";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element for the application entry.");
}

const basePath = import.meta.env.BASE_URL;
const route = parseAppRoute(
  window.location.pathname,
  basePath,
  isToolId,
  isPageId,
);

if (route.kind === "invalid") {
  window.location.replace(getHomeHref(basePath));
} else if (route.kind === "page") {
  const page = findPage(route.pageId);

  if (!page) {
    window.location.replace(getHomeHref(basePath));
  } else {
    document.title = `${page.title}｜工具匣`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", page.description);
    createRoot(root).render(<PagePanel pageId={route.pageId} />);
  }
} else {
  createRoot(root).render(
    <ToolboxApp
      initialToolId={route.kind === "tool" ? route.toolId : null}
      basePath={basePath}
    />,
  );
}
