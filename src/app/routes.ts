import type { RouteConfig } from "@react-router/dev/routes";
export default [
  { index: true, file: "routes/home.tsx" },
  { path: ":toolId", file: "routes/tool.tsx" },
  { path: "*", file: "routes/fallback.tsx" },
] satisfies RouteConfig;
