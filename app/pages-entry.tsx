import { createRoot } from "react-dom/client";
import "./globals.css";
import { ToolboxApp } from "./toolbox-app";
import { isToolId } from "./tool-registry";
import { getHomeHref, parseToolRoute } from "./tool-routes";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element for the GitHub Pages entry.");
}

const basePath = import.meta.env.BASE_URL;
const route = parseToolRoute(window.location.pathname, basePath, isToolId);

if (route.kind === "invalid") {
  window.location.replace(getHomeHref(basePath));
} else {
  createRoot(root).render(
    <ToolboxApp
      initialToolId={route.kind === "tool" ? route.toolId : null}
      basePath={basePath}
    />,
  );
}
