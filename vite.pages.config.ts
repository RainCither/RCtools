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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
      name: "github-pages-static-routes",

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
