import type { Config } from "@react-router/dev/config";
import { generateCatalog } from "./build/catalog.mts";
import { site } from "./build/site.mts";
const tools = await generateCatalog();
export default {
  appDirectory: "src/app",
  buildDirectory: "dist",
  basename: site.basename,
  ssr: false,
  routeDiscovery: { mode: "initial" },
  prerender: ["/", ...tools.map((tool) => `/${tool.id}/`)],
} satisfies Config;
