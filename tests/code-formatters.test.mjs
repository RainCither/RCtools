import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCss,
  minifyCss,
} from "../app/tools/css-formatter/css-formatter-core.ts";
import {
  detectJavaScriptModule,
  formatJavaScript,
  minifyJavaScript,
} from "../app/tools/js-formatter/js-formatter-core.ts";
import {
  formatHtml,
  minifyHtml,
} from "../app/tools/html-formatter/html-formatter-core.ts";

test("formats and minifies standard CSS", async () => {
  const formatted = await formatCss(".card{color:#ff0000;padding:12px 12px 12px 12px}");
  assert.match(formatted, /\.card \{/);
  assert.match(formatted, /color: #ff0000;/);

  const minified = await minifyCss(".card { color: #ff0000; padding: 12px 12px 12px 12px; }");
  assert.equal(minified, ".card{color:red;padding:12px}");
  await assert.rejects(formatCss("   "), /请输入 CSS 内容/);
  await assert.rejects(minifyCss("\n"), /请输入 CSS 内容/);
});

test("formats scripts and ES modules while rejecting JSX and TypeScript", async () => {
  const script = await formatJavaScript("const answer=40+2;console.log(answer)");
  assert.match(script, /const answer = 40 \+ 2;/);
  assert.match(script, /console\.log\(answer\);/);

  const moduleSource = "export const answer=40+2";
  assert.equal(await detectJavaScriptModule(moduleSource), true);
  assert.match(await formatJavaScript(moduleSource), /export const answer = 40 \+ 2;/);
  assert.equal(await detectJavaScriptModule("console.log('ok')"), false);
  assert.equal(await detectJavaScriptModule('const text = "export const answer = 42";'), false);
  assert.equal(await detectJavaScriptModule("await Promise.resolve();"), true);
  assert.equal(await detectJavaScriptModule("console.log(import.meta.url);"), true);
  assert.equal(await detectJavaScriptModule('import("./feature.js");'), false);

  await assert.rejects(formatJavaScript("const view = <div />;"), /不支持 JSX 或 TypeScript/);
  await assert.rejects(formatJavaScript("const count: number = 1;"), /不支持 JSX 或 TypeScript/);
  await assert.rejects(minifyJavaScript("", "mangle"), /请输入 JavaScript 内容/);
});

test("supports JavaScript minification with and without identifier mangling", async () => {
  const source = `function calculate(longParameter) {
    return longParameter * longParameter;
  }
  console.log(calculate(4));`;
  const mangled = await minifyJavaScript(source, "mangle");
  const preserved = await minifyJavaScript(source, "preserve-names");

  assert.doesNotMatch(mangled, /longParameter/);
  assert.match(preserved, /longParameter/);
  assert.ok(mangled.length < source.length);
  assert.ok(preserved.length < source.length);

  const moduleResult = await minifyJavaScript(
    "export function calculate(longParameter){return longParameter*2}",
    "preserve-names",
  );
  assert.match(moduleResult, /^export function calculate\(longParameter\)/);
});

test("formats HTML with embedded CSS and JavaScript", async () => {
  const formatted = await formatHtml(
    '<main><style>.card{color:red}</style><script>const answer=40+2;console.log(answer)</script><div class="card">Tool</div></main>',
  );

  assert.match(formatted, /<style>\n\s+\.card \{/);
  assert.match(formatted, /const answer = 40 \+ 2;/);
  assert.match(formatted, /<div class="card">Tool<\/div>/);
});

test("conservatively minifies HTML and embedded code", async () => {
  const source = `<!doctype html>
<html><head>
<!--[if IE]>keep<![endif]-->
<!-- remove -->
<style>.card { color: #ff0000; padding: 12px 12px 12px 12px; }</style>
</head><body>
<main class="card"> A   B </main>
<script>function announce(messageText){window.latestMessage=messageText}window.announce=announce;</script>
<pre>  A
  B <!-- keep in pre --></pre>
<textarea>  C
  D  </textarea>
</body></html>`;
  const minified = await minifyHtml(source);

  assert.match(minified, /^<!DOCTYPE html><html>/);
  assert.match(minified, /<!--\[if IE\]>keep<!\[endif\]-->/);
  assert.doesNotMatch(minified, /remove/);
  assert.match(minified, /\.card\{color:red;padding:12px\}/);
  assert.match(minified, /<main class="card"> A B <\/main>/);
  assert.match(minified, /messageText/);
  assert.match(minified, /<pre>  A\n  B <!-- keep in pre --><\/pre>/);
  assert.match(minified, /<textarea>  C\n  D  <\/textarea>/);
});

test("keeps HTML fragments, external scripts, and non-code script types intact", async () => {
  const json = ` {
  "name": "Tool"
} `;
  const externalFallback = " fallback   text ";
  const minified = await minifyHtml(
    `<section>  A   B </section><script type="application/ld+json">${json}</script><script src="app.js">${externalFallback}</script>`,
  );

  assert.doesNotMatch(minified, /<html>/);
  assert.match(minified, /^<section> A B <\/section>/);
  assert.ok(minified.includes(json));
  assert.ok(minified.includes(externalFallback));
  await assert.rejects(minifyHtml("  "), /请输入 HTML 内容/);
});
