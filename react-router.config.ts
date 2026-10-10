/** @file 配置应用目录、输出目录、站点基础路径和静态页面生成；从工具配置派生首页及全部工具的预渲染路径。 */
import type { Config } from "@react-router/dev/config";
import { generateCatalog } from "./build/catalog.mts";
import { site } from "./build/site.mts";
// 工具发现与预渲染使用同一份合法配置，新增工具无需再维护中央路径表。
const tools = await generateCatalog();
export default {
  appDirectory: "src/app",
  buildDirectory: "dist",
  basename: site.basename,
  ssr: false,
  routeDiscovery: { mode: "initial" },
  prerender: ["/", ...tools.map((tool) => `/${tool.id}/`)],
} satisfies Config;
