/** 配置 Vite 构建，并为每个工具生成可直达的静态 HTML 路由。 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { readRegisteredTools } from "./scripts/read-tool-registry.mjs";

const basePath = process.env.PAGES_BASE_PATH ?? "/";
const customDomain =
  process.env.PAGES_CUSTOM_DOMAIN ?? "tool.raincither.top";

if (
  !basePath.startsWith("/") ||
  (basePath.length > 1 && basePath.endsWith("/"))
) {
  throw new Error("PAGES_BASE_PATH must start with / and must not end with /.");
}

const outputDirectory = resolve(import.meta.dirname, "dist");
const publicBasePath = basePath === "/" ? "/" : `${basePath}/`;

/** 转义写入 HTML 文本与属性的动态元数据。 */
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** 用工具标题和简介替换首页模板中的 SEO 元数据。 */
function withToolMetadata(html: string, title: string, description: string) {
  return html
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${escapeHtml(title)}｜工具匣</title>`,
    )
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );
}

/** 创建静态托管环境使用的 404 首页重定向文档。 */
function createNotFoundHtml() {
  const serializedHomePath = JSON.stringify(publicBasePath).replaceAll(
    "<",
    "\\u003c",
  );
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0;url=${escapeHtml(publicBasePath)}" />
    <title>正在返回工具匣</title>
  </head>
  <body>
    <p>页面不存在，正在返回<a href="${escapeHtml(publicBasePath)}">工具匣首页</a>。</p>
    <script>window.location.replace(${serializedHomePath});</script>
  </body>
</html>
`;
}

export default defineConfig({
  base: basePath === "/" ? "/" : `${basePath}/`,
  plugins: [
    react(),
    {
      name: "static-tool-routes",

      /** 构建结束后写入静态路由页、路由清单和 Pages 辅助文件。 */
      async closeBundle() {
        const tools = await readRegisteredTools(import.meta.dirname);
        const indexHtml = await readFile(
          resolve(outputDirectory, "index.html"),
          "utf8",
        );
        const routeManifest = {
          basePath: publicBasePath,
          routes: tools.map((tool) => tool.id),
        };

        await Promise.all([
          writeFile(resolve(outputDirectory, ".nojekyll"), "", "utf8"),
          writeFile(
            resolve(outputDirectory, "CNAME"),
            `${customDomain}\n`,
            "utf8",
          ),
          writeFile(
            resolve(outputDirectory, "404.html"),
            createNotFoundHtml(),
            "utf8",
          ),
          writeFile(
            resolve(outputDirectory, "tool-routes.json"),
            `${JSON.stringify(routeManifest, null, 2)}\n`,
            "utf8",
          ),
          ...tools.map(async (tool) => {
            const routeDirectory = resolve(outputDirectory, tool.id);
            await mkdir(routeDirectory, { recursive: true });
            await writeFile(
              resolve(routeDirectory, "index.html"),
              withToolMetadata(indexHtml, tool.title, tool.summary),
              "utf8",
            );
          }),
        ]);
      },
    },
  ],
  build: {
    emptyOutDir: true,
  },
});
