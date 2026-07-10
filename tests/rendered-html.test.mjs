import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/ssr/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the personal toolbox", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>工具匣｜常用小工具，一开即用<\/title>/i);
  assert.match(html, /搜索工具或功能/);
  assert.match(html, /JSON 格式化/);
  assert.match(html, /时间戳转换/);
  assert.match(html, /Base64 编解码/);
  assert.match(html, /本地处理/);
  assert.doesNotMatch(html, /把重复的小事|hero-copy|<h1>/);
  assert.doesNotMatch(html, /自动保存在当前设备|>添加工具</);
  assert.doesNotMatch(html, />扩展<|开发指南|添加一个新工具/);
  assert.doesNotMatch(html, /↗/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps the tool registry modular and removes the starter preview", async () => {
  const [registry, panels, toolbox, page, packageJson] = await Promise.all([
    readFile(new URL("../app/tool-registry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-panels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/toolbox-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(registry, /export const TOOLS/);
  assert.match(registry, /searchTerms/);
  assert.match(panels, /export function ToolPanel/);
  assert.match(panels, /lazy\(\(\) =>/);
  assert.match(panels, /import\("\.\/tools\/json-tool"\)/);
  assert.doesNotMatch(panels, /useState|function JsonTool|function PasswordTool/);
  assert.doesNotMatch(toolbox, /developerGuide|showDeveloperGuide|添加一个新工具/);
  assert.match(page, /<ToolboxApp \/>/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(packageJson, /cloudflare|drizzle|tailwind|wrangler/);
  await Promise.all(
    [
      "base64-tool.tsx",
      "color-tool.tsx",
      "json-tool.tsx",
      "password-tool.tsx",
      "text-stats-tool.tsx",
      "timestamp-tool.tsx",
      "shared.tsx",
    ].map((fileName) => access(new URL(`app/tools/${fileName}`, templateRoot))),
  );
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
  await assert.rejects(access(new URL(".openai/hosting.json", templateRoot)));
});

test("builds each tool as an independent client chunk", async () => {
  const clientAssets = await readdir(
    new URL("../dist/client/assets/", import.meta.url),
  );
  const toolChunks = [
    "base64-tool",
    "color-tool",
    "json-tool",
    "password-tool",
    "text-stats-tool",
    "timestamp-tool",
  ];

  for (const chunkName of toolChunks) {
    assert.equal(
      clientAssets.some((fileName) =>
        fileName.startsWith(`${chunkName}-`) && fileName.endsWith(".js"),
      ),
      true,
      `missing dynamic chunk for ${chunkName}`,
    );
  }
});
