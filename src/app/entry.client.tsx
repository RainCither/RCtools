/** @file 浏览器启动入口。检查当前工具路径，接管预渲染 HTML 并激活 React Router 页面交互。 */
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { TOOL_IDS } from "../generated/catalog";
const base = import.meta.env.BASE_URL;
const path = location.pathname.startsWith(base)
  ? location.pathname.slice(base.length).replace(/\/$/, "")
  : "";
// 未知静态地址先回到站点根路径，避免用工具页面框架接管不匹配的 HTML。
if (path && !(TOOL_IDS as readonly string[]).includes(path)) location.replace(base);
else
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
