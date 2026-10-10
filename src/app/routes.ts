/** @file 定义三类路由：首页 /、工具页 :toolId 和未知路径 *。 */
import type { RouteConfig } from "@react-router/dev/routes";
export default [
  { index: true, file: "routes/home.tsx" },
  { path: ":toolId", file: "routes/tool.tsx" },
  { path: "*", file: "routes/fallback.tsx" },
] satisfies RouteConfig;
