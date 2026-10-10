/** @file 构建后的 Pages 整理入口。调整目录层级，生成 .nojekyll、CNAME、静态 404.html、工具路径清单和构建版本信息。 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { projectRoot, readCatalog } from "./catalog.mts";
import { site } from "./site.mts";
import { flattenPages } from "./flatten-pages.mts";
const output = join(projectRoot, "dist/client");
await mkdir(output, { recursive: true });
await flattenPages(output, site.basename);
const tools = await readCatalog();
const home = site.assetBase;
const href = home.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
// 静态发布辅助文件与页面一同生成，让 Pages 直接服务构建输出。
await writeFile(join(output, ".nojekyll"), "", "utf8");
if (site.domain) await writeFile(join(output, "CNAME"), `${site.domain}\n`, "utf8");
else await rm(join(output, "CNAME"), { force: true });
await writeFile(
  join(output, "404.html"),
  `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${href}"><title>返回工具匣</title></head><body><p>页面不存在，正在返回<a href="${href}">工具匣首页</a>。</p><script>location.replace(${JSON.stringify(home).replaceAll("<", "\\u003c")})</script></body></html>`,
  "utf8",
);
await writeFile(
  join(output, "tool-routes.json"),
  JSON.stringify({ basePath: home, routes: tools.tools.map((tool) => tool.id) }, null, 2) + "\n",
  "utf8",
);
// 记录源码与锁文件指纹，使回滚能够重建同一套依赖和页面资源。
await writeFile(
  join(output, "build-info.json"),
  JSON.stringify(
    {
      buildId: process.env.GITHUB_SHA ?? "dev",
      sourceCommit: process.env.GITHUB_SHA ?? null,
      lockfileSha256: createHash("sha256")
        .update(await readFile(join(projectRoot, "package-lock.json")))
        .digest("hex"),
      version: (
        JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8")) as { version: string }
      ).version,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
