import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/ssr/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(new URL(pathname, "http://localhost/"), {
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

async function assertRedirectsHome(pathname) {
  try {
    const response = await render(pathname);
    assert.match(String(response.status), /^30[78]$/);
    assert.equal(
      new URL(response.headers.get("location"), "http://localhost").pathname,
      "/",
    );
  } catch (error) {
    // Vinext's direct worker test adapter can expose the framework redirect
    // control signal for not-found boundaries instead of converting it to a
    // Response. Keep the assertion strict so ordinary render failures fail.
    assert.equal(error?.digest, "NEXT_REDIRECT;;%2F");
  }
}

test("server-renders the personal toolbox", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>工具匣｜常用小工具，一开即用<\/title>/i);
  assert.match(html, /搜索工具或功能/);
  assert.match(html, /JSON 格式化/);
  assert.match(html, /CSS 格式化压缩/);
  assert.match(html, /JavaScript 格式化压缩/);
  assert.match(html, /HTML 格式化压缩/);
  assert.match(html, /正则表达式测试/);
  assert.match(html, /时间戳转换/);
  assert.match(html, /连续时间差/);
  assert.match(html, /故障文字生成/);
  assert.match(html, /Base64 编解码/);
  assert.match(html, /MD5 加密与校验/);
  assert.match(html, /SHA-1 \/ SHA-2 哈希与校验/);
  assert.match(html, /进制转换/);
  assert.match(html, /IEEE-754 浮点数转换/);
  assert.match(html, /雨寒风轻筝音悠/);
  assert.match(html, /aria-label="搜索工具"/);
  assert.match(html, /href="\/json\/"/);
  assert.doesNotMatch(html, /<dialog|tool-dialog|aria-labelledby="tool-dialog-title"/);
  assert.doesNotMatch(html, /把重复的小事|hero-copy|<h1>/);
  assert.doesNotMatch(html, /自动保存在当前设备|>添加工具</);
  assert.doesNotMatch(html, />扩展<|开发指南|添加一个新工具/);
  assert.doesNotMatch(html, /↗/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("server resolves tool routes, metadata and invalid redirects", async () => {
  const canonicalResponse = await render("/json/");
  assert.equal(canonicalResponse.status, 308);
  assert.equal(
    new URL(canonicalResponse.headers.get("location"), "http://localhost").pathname,
    "/json",
  );

  const toolResponse = await render("/json");
  assert.equal(toolResponse.status, 200);
  const html = await toolResponse.text();
  assert.match(html, /<title>JSON 格式化｜工具匣<\/title>/i);
  assert.match(html, /校验、格式化或压缩 JSON 数据/);
  assert.match(html, /initialToolId/);
  assert.match(html, /json/);
  assert.doesNotMatch(html, /搜索工具或功能/);

  await assertRedirectsHome("/unknown");
  await assertRedirectsHome("/json/details");
});

test("keeps the tool registry modular and removes the starter preview", async () => {
  const [registry, toolTypes, panels, routes, toolbox, page, routePage, packageJson, globalStyles] = await Promise.all([
    readFile(new URL("../app/tool-registry.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-types.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-panels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-routes.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/toolbox-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[toolId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(registry, /export const TOOLS/);
  assert.match(registry, /export type ToolId = \(typeof TOOLS\)\[number\]\["id"\]/);
  assert.match(registry, /export function isToolId/);
  assert.match(registry, /TOOL_BY_ID/);
  assert.match(toolTypes, /export function defineTool/);
  assert.match(toolTypes, /TOOL_CATEGORY_LABELS/);
  assert.match(toolTypes, /export type ToolLoader/);
  assert.doesNotMatch(toolTypes, /\| "json"/);
  assert.match(panels, /export function ToolPanel/);
  assert.match(panels, /TOOLS\.map/);
  assert.match(panels, /TOOL_LOAD_PROMISES/);
  assert.match(panels, /TOOL_COMPONENTS\.delete\(toolId\)/);
  assert.match(panels, /export function preloadTool/);
  assert.match(panels, /重新加载/);
  assert.doesNotMatch(panels, /import\("\.\/tools\//);
  assert.doesNotMatch(panels, /function JsonTool|function PasswordTool/);
  assert.match(routes, /export function parseToolRoute/);
  assert.match(routes, /export function getToolHref/);
  assert.match(toolbox, /HOVER_PRELOAD_DELAY = 120/);
  assert.match(toolbox, /onPointerLeave=\{cancelScheduledPreload\}/);
  assert.match(toolbox, /onFocus=\{\(\) =>/);
  assert.match(toolbox, /window\.history\.pushState/);
  assert.match(toolbox, /window\.addEventListener\("popstate"/);
  assert.doesNotMatch(toolbox, /<dialog|showModal\(|preventBackgroundWheel/);
  assert.doesNotMatch(toolbox, /developerGuide|showDeveloperGuide|添加一个新工具/);
  assert.match(page, /initialToolId=\{null\}/);
  assert.match(page, /PAGES_BASE_PATH/);
  assert.match(routePage, /generateStaticParams/);
  assert.match(routePage, /generateMetadata/);
  assert.match(routePage, /redirect\("\/"\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(packageJson, /cloudflare|drizzle|tailwind|wrangler/);
  const toolFiles = [
    ["base64", "base64-tool.tsx"],
    ["base-converter", "base-converter-core.ts"],
    ["base-converter", "base-converter-tool.tsx"],
    ["base-converter", "styles.module.css"],
    ["ieee-754", "ieee-754-core.ts"],
    ["ieee-754", "ieee-754-tool.tsx"],
    ["ieee-754", "styles.module.css"],
    ["color", "color-tool.tsx"],
    ["css-formatter", "css-formatter-core.ts"],
    ["css-formatter", "css-formatter-tool.tsx"],
    ["glitch-text", "glitch-text-core.ts"],
    ["glitch-text", "glitch-text-tool.tsx"],
    ["glitch-text", "styles.module.css"],
    ["json", "json-tool.tsx"],
    ["js-formatter", "js-formatter-core.ts"],
    ["js-formatter", "js-formatter-tool.tsx"],
    ["js-formatter", "styles.module.css"],
    ["md5", "md5-core.ts"],
    ["md5", "md5-tool.tsx"],
    ["md5", "styles.module.css"],
    ["sha", "sha-core.ts"],
    ["sha", "sha-tool.tsx"],
    ["sha", "styles.module.css"],
    ["html-formatter", "html-formatter-core.ts"],
    ["html-formatter", "html-formatter-tool.tsx"],
    ["password", "password-tool.tsx"],
    ["text-stats", "text-stats-tool.tsx"],
    ["text-stats", "styles.module.css"],
    ["password", "styles.module.css"],
    ["regex", "regex-core.ts"],
    ["regex", "regex-reference.ts"],
    ["regex", "regex-tool.tsx"],
    ["regex", "styles.module.css"],
    ["color", "styles.module.css"],
    ["time-diff", "time-diff-core.ts"],
    ["time-diff", "time-diff-tool.tsx"],
    ["time-diff", "styles.module.css"],
    ["timestamp", "timestamp-tool.tsx"],
  ];
  const toolEntries = await readdir(new URL("app/tools/", templateRoot), {
    withFileTypes: true,
  });
  assert.deepEqual(
    toolEntries.filter((entry) => entry.isFile()).map((entry) => entry.name),
    [],
  );
  await Promise.all([
    ...toolFiles.flatMap(([directory, fileName]) => [
      access(new URL(`app/tools/${directory}/${fileName}`, templateRoot)),
      access(new URL(`app/tools/${directory}/config.ts`, templateRoot)),
    ]),
    access(new URL("app/tools/shared/tool-ui.tsx", templateRoot)),
    access(new URL("app/tools/shared/code-transform-tool.tsx", templateRoot)),
    access(new URL("app/tools/shared/code-transform-tool.module.css", templateRoot)),
    access(new URL("app/tools/shared/hash-file.ts", templateRoot)),
  ]);
  const configSources = await Promise.all(
    ["base64", "base-converter", "color", "css-formatter", "glitch-text", "html-formatter", "ieee-754", "js-formatter", "json", "md5", "password", "regex", "sha", "text-stats", "time-diff", "timestamp"]
      .map((directory) => readFile(
        new URL(`app/tools/${directory}/config.ts`, templateRoot),
        "utf8",
      )),
  );
  for (const configSource of configSources) {
    assert.match(configSource, /defineTool\(\{/);
    assert.match(configSource, /load: \(\) =>/);
    assert.match(configSource, /import\("\.\/[^\"]+-tool"\)/);
    assert.doesNotMatch(configSource, /\.then\(/);
    assert.doesNotMatch(configSource, /categoryLabel/);
  }
  assert.match(registry, /from "\.\/tools\/json\/config"/);
  assert.match(registry, /from "\.\/tools\/base-converter\/config"/);
  assert.match(registry, /from "\.\/tools\/css-formatter\/config"/);
  assert.match(registry, /from "\.\/tools\/js-formatter\/config"/);
  assert.match(registry, /from "\.\/tools\/html-formatter\/config"/);
  assert.match(registry, /from "\.\/tools\/ieee-754\/config"/);
  assert.match(registry, /from "\.\/tools\/md5\/config"/);
  assert.match(registry, /from "\.\/tools\/sha\/config"/);
  assert.match(registry, /from "\.\/tools\/regex\/config"/);
  assert.doesNotMatch(registry, /title: "JSON 格式化"/);
  assert.doesNotMatch(globalStyles, /\.time-diff-tool|\.stat-grid|\.range-heading|\.color-input-row/);
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
  await assert.rejects(access(new URL(".openai/hosting.json", templateRoot)));
});

test("builds each tool as an independent client chunk", async () => {
  const clientAssets = await readdir(
    new URL("../dist/client/assets/", import.meta.url),
  );
  const toolChunks = [
    "base64-tool",
    "base-converter-tool",
    "ieee-754-tool",
    "color-tool",
    "css-formatter-tool",
    "glitch-text-tool",
    "html-formatter-tool",
    "json-tool",
    "js-formatter-tool",
    "md5-tool",
    "sha-tool",
    "password-tool",
    "regex-tool",
    "text-stats-tool",
    "time-diff-tool",
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

test("guards tool behavior and accessibility contracts", async () => {
  const [shared, codeTransform, timestamp, password, timeDiff, glitchText, glitchCore, toolbox, colorConfig, timeDiffConfig, baseConverter, baseConverterCore, baseConverterConfig, ieee754, ieee754Core, ieee754Config, cssFormatterCore, cssFormatterConfig, jsFormatter, jsFormatterCore, jsFormatterConfig, htmlFormatterCore, htmlFormatterConfig, md5Tool, md5Core, md5Config, shaTool, shaCore, shaConfig, hashFile, regexTool, regexCore, regexReference, regexConfig] = await Promise.all([
    readFile(new URL("../app/tools/shared/tool-ui.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/shared/code-transform-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/timestamp/timestamp-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/password/password-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/time-diff/time-diff-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/glitch-text/glitch-text-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/glitch-text/glitch-text-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/toolbox-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/color/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/time-diff/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/base-converter/base-converter-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/base-converter/base-converter-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/base-converter/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/ieee-754/ieee-754-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/ieee-754/ieee-754-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/ieee-754/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/css-formatter/css-formatter-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/css-formatter/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/js-formatter/js-formatter-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/js-formatter/js-formatter-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/js-formatter/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/html-formatter/html-formatter-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/html-formatter/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/md5/md5-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/md5/md5-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/md5/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/sha/sha-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/sha/sha-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/sha/config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/shared/hash-file.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/regex/regex-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/regex/regex-core.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/regex/regex-reference.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tools/regex/config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(shared, /error \|\| message \|\|/);
  assert.match(shared, /复制失败/);
  assert.match(shared, /label = "结果"/);
  assert.match(shared, /idleText = "复制结果"/);
  assert.match(shared, /aria-label=/);
  assert.match(codeTransform, /aria-busy=\{busy\}/);
  assert.match(codeTransform, /setOutput\(""\)/);
  assert.match(codeTransform, /aria-invalid=\{Boolean\(error\)\}/);
  assert.match(codeTransform, /正在格式化/);
  assert.match(codeTransform, /正在压缩/);
  assert.doesNotMatch(timestamp, /\\d\{10,13\}/);
  assert.match(timestamp, /时间戳必须是 10 位秒数或 13 位毫秒数/);
  assert.match(password, /secureRandomIndex/);
  assert.match(password, /selectedPools\.map\(randomCharacter\)/);
  assert.match(timeDiff, /省略冒号/);
  assert.match(timeDiff, /开始到结束总时间差/);
  assert.match(timeDiff, /type TimeDiffMode = "continuous" \| "pairs"/);
  assert.match(timeDiff, /aria-label="计算方式"/);
  assert.match(timeDiff, /全部时间对总差值/);
  assert.match(timeDiff, /handlePairKeyDown/);
  assert.match(timeDiff, /添加时间对/);
  assert.match(timeDiff, /sumCalculatedDifferences/);
  assert.match(timeDiff, /aria-live="polite"/);
  assert.match(timeDiff, /event\.key !== "Tab"/);
  assert.match(glitchText, /aria-hidden="true"/);
  assert.match(glitchText, /结果只在点击生成时更新/);
  assert.match(glitchText, /Unicode 17/);
  assert.match(glitchCore, /Intl\.Segmenter/);
  assert.match(glitchCore, /String\.fromCodePoint/);
  assert.doesNotMatch(glitchCore, /0x034f|0xfe20|0x20e3/);
  assert.match(toolbox, /aria-label="搜索工具"/);
  assert.match(toolbox, /aria-labelledby="tool-page-title"/);
  assert.match(toolbox, /返回全部工具/);
  assert.match(toolbox, /document\.title = tool/);
  assert.match(toolbox, /meta\[name=\"description\"\]/);
  assert.match(toolbox, /window\.localStorage\.setItem\(RECENT_STORAGE_KEY/);
  assert.doesNotMatch(toolbox, /<label className="search-box header-search"/);
  assert.match(colorConfig, /将 HEX 颜色转换为 RGB 与 HSL/);
  assert.match(timeDiffConfig, /成对时间差/);
  assert.match(baseConverter, /aria-invalid=\{Boolean\(conversion\.error\)\}/);
  assert.match(baseConverter, /label=\{`\$\{option\.label\}结果`\}/);
  assert.match(baseConverter, /role=\{conversion\.error \? "alert"/);
  assert.match(baseConverterCore, /value = value \* baseValue \+ BigInt\(digit\)/);
  assert.match(baseConverterCore, /toUpperCase\(\)/);
  assert.match(baseConverterConfig, /在二、八、十、十六进制整数之间精确转换/);
  assert.match(ieee754, /type FloatInputMode/);
  assert.match(ieee754, /aria-pressed=/);
  assert.match(ieee754, /aria-invalid=\{Boolean\(conversion\.error\)\}/);
  assert.match(ieee754, /role=\{conversion\.error \? "alert"/);
  assert.match(ieee754, /label=\{`\$\{item\.label\}结果`\}/);
  assert.match(ieee754Core, /new DataView/);
  assert.match(ieee754Core, /setFloat32\(0, value, false\)/);
  assert.match(ieee754Core, /CANONICAL_NAN_BYTES/);
  assert.match(ieee754Core, /Uint8Array\.from\(bytes\)\.reverse\(\)/);
  assert.match(ieee754Config, /Float32\/Float64 位模式之间双向转换/);
  assert.match(cssFormatterCore, /import\("prettier\/standalone"\)/);
  assert.match(cssFormatterCore, /import\("csso"\)/);
  assert.match(cssFormatterConfig, /格式化或压缩标准 CSS/);
  assert.match(jsFormatter, /改名压缩/);
  assert.match(jsFormatter, /保留名称/);
  assert.match(jsFormatter, /aria-pressed=/);
  assert.match(jsFormatterCore, /type JavaScriptMinifyMode = "mangle" \| "preserve-names"/);
  assert.match(jsFormatterCore, /import\("terser"\)/);
  assert.match(jsFormatterCore, /不支持 JSX 或 TypeScript/);
  assert.match(jsFormatterConfig, /现代 JavaScript 与 ES Modules/);
  assert.match(htmlFormatterCore, /import\("parse5"\)/);
  assert.match(htmlFormatterCore, /mangle: false/);
  assert.match(htmlFormatterCore, /WHITESPACE_SENSITIVE_ELEMENTS/);
  assert.match(htmlFormatterConfig, /内嵌 CSS 与 JavaScript/);
  assert.match(md5Tool, /MD5\s+是单向摘要，不能直接还原原始内容/);
  assert.match(md5Tool, /type="file"/);
  assert.match(md5Tool, /aria-pressed=/);
  assert.match(md5Tool, /aria-busy=\{busy\}/);
  assert.match(md5Tool, /aria-invalid=\{Boolean\(verificationError\)\}/);
  assert.match(md5Tool, /role=\{verificationError \? "alert" : "status"\}/);
  assert.match(md5Tool, /最大 \{MAX_HASH_FILE_LABEL\}/);
  assert.match(md5Tool, /文件仅在当前浏览器本地读取，不会上传/);
  assert.match(md5Tool, /disabled=\{busy \|\| !hasSource\}/);
  assert.match(md5Tool, /校验通过：\$\{candidateLabel\}与目标 MD5 匹配/);
  assert.match(md5Core, /hash-wasm\/dist\/md5\.umd\.min\.js/);
  assert.match(md5Core, /const \{ md5 \} = hashWasmMd5/);
  assert.match(md5Core, /export function md5Bytes/);
  assert.match(md5Core, /new TextEncoder\(\)\.encode\(value\)/);
  assert.match(md5Core, /MD5_PATTERN/);
  assert.doesNotMatch(md5Core, /ROTATION_AMOUNTS|ROUND_CONSTANTS/);
  assert.match(md5Config, /计算文本或小文件的 MD5 摘要/);
  assert.match(shaTool, /SHA-1 仅适合兼容旧系统/);
  assert.match(shaTool, /type="file"/);
  assert.match(shaTool, /aria-pressed=/);
  assert.match(shaTool, /aria-busy=\{busy\}/);
  assert.match(shaTool, /aria-invalid=\{Boolean\(verificationError\)\}/);
  assert.match(shaTool, /最大 \{MAX_HASH_FILE_LABEL\}/);
  assert.match(shaTool, /文件仅在当前浏览器本地读取，不会上传/);
  assert.match(shaTool, /disabled=\{busy \|\| !hasSource\}/);
  assert.match(shaTool, /校验通过：\$\{candidateLabel\}与目标 \$\{algorithm\} 匹配/);
  assert.match(shaCore, /\["SHA-1", "SHA-256", "SHA-512"\]/);
  assert.match(shaCore, /hash-wasm\/dist\/sha1\.umd\.min\.js/);
  assert.match(shaCore, /hash-wasm\/dist\/sha256\.umd\.min\.js/);
  assert.match(shaCore, /hash-wasm\/dist\/sha512\.umd\.min\.js/);
  assert.match(shaCore, /export function shaBytes/);
  assert.doesNotMatch(shaCore, /crypto\.subtle|globalThis\.crypto/);
  assert.match(shaCore, /new TextEncoder\(\)\.encode\(value\)/);
  assert.match(shaConfig, /计算文本或小文件的 SHA-1、SHA-256 或 SHA-512 摘要/);
  assert.match(hashFile, /20 \* 1024 \* 1024/);
  assert.match(hashFile, /file\.arrayBuffer\(\)/);
  assert.match(hashFile, /文件读取失败，请重新选择后再试/);
  assert.match(regexTool, /useMemo/);
  assert.doesNotMatch(regexTool, /useEffect|dangerouslySetInnerHTML/);
  assert.match(regexTool, /aria-invalid=\{Boolean\(error\)\}/);
  assert.match(regexTool, /role=\{error \? "alert" : "status"\}/);
  assert.match(regexTool, /type="checkbox"/);
  assert.match(regexTool, /role="tablist"/);
  assert.match(regexTool, /role="tab"/);
  assert.match(regexTool, /role="tabpanel"/);
  assert.match(regexTool, /aria-selected=\{view === option\.id\}/);
  assert.match(regexTool, /ArrowRight/);
  assert.match(regexTool, /ArrowLeft/);
  assert.match(regexTool, /event\.key === "Home"/);
  assert.match(regexTool, /event\.key === "End"/);
  assert.match(regexTool, /复制表达式/);
  assert.match(regexTool, /载入测试器/);
  assert.match(regexTool, /JSON\.stringify\(entry\.positiveExample\)/);
  assert.match(regexTool, /JSON\.stringify\(entry\.negativeExample\)/);
  assert.match(regexTool, /setReplacement\(""\)/);
  assert.match(regexTool, /支持 \$&amp;、\$1、\$&lt;name&gt;、\$\$/);
  assert.match(regexReference, /export type RegexView/);
  assert.match(regexReference, /export type RegexSyntaxSection/);
  assert.match(regexReference, /export type CommonRegexEntry/);
  assert.match(regexReference, /REGEX_SYNTAX_SECTIONS/);
  assert.match(regexReference, /COMMON_REGEXES/);
  assert.match(regexReference, /号段会随运营规则变化/);
  assert.match(regexCore, /MAX_DISPLAYED_MATCHES = 500/);
  assert.match(regexCore, /advanceStringIndex/);
  assert.match(regexCore, /source\.replace\(new RegExp\(pattern, flags\), replacement\)/);
  assert.match(regexConfig, /语法速查/);
  assert.match(regexConfig, /常用正则/);
  assert.match(regexConfig, /cheatsheet/);
});

test("keeps exact audited dependency versions", async () => {
  const [packageSource, lockSource] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageSource);

  assert.equal(packageJson.dependencies.postcss, "8.5.14");
  assert.equal(packageJson.dependencies["hash-wasm"], "4.12.0");
  assert.equal(packageJson.overrides.next.postcss, "8.5.14");
  assert.match(lockSource, /"node_modules\/hash-wasm": \{/);
  assert.match(lockSource, /"version": "4\.12\.0"/);
  assert.doesNotMatch(lockSource, /node_modules\/next\/node_modules\/postcss/);
});
