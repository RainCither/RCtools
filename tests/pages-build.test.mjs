import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("creates only static GitHub Pages output", async () => {
  await Promise.all([
    access(new URL("dist/index.html", projectRoot)),
    access(new URL("dist/favicon.svg", projectRoot)),
    access(new URL("dist/.nojekyll", projectRoot)),
    access(new URL("dist/CNAME", projectRoot)),
  ]);

  const [html, cname] = await Promise.all([
    readFile(new URL("dist/index.html", projectRoot), "utf8"),
    readFile(new URL("dist/CNAME", projectRoot), "utf8"),
  ]);
  assert.match(html, /<title>工具匣｜常用小工具，一开即用<\/title>/);
  assert.match(html, /\/assets\/[^"']+\.js/);
  assert.match(html, /\/favicon\.svg/);
  assert.doesNotMatch(html, /\/RCtools\//i);
  assert.doesNotMatch(html, /dist\/server|__vite_rsc|vinext-server/);
  assert.equal(cname.trim(), "tool.raincither.top");
});

test("keeps every tool in an independent client chunk", async () => {
  const assets = await readdir(new URL("dist/assets/", projectRoot));
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
      assets.some(
        (fileName) =>
          fileName.startsWith(`${chunkName}-`) && fileName.endsWith(".js"),
      ),
      true,
      `missing dynamic chunk for ${chunkName}`,
    );
  }

  const toolStyleChunks = [
    "base-converter-tool",
    "ieee-754-tool",
    "color-tool",
    "glitch-text-tool",
    "js-formatter-tool",
    "md5-tool",
    "sha-tool",
    "password-tool",
    "regex-tool",
    "text-stats-tool",
    "time-diff-tool",
  ];

  for (const chunkName of toolStyleChunks) {
    assert.equal(
      assets.some(
        (fileName) =>
          fileName.startsWith(`${chunkName}-`) && fileName.endsWith(".css"),
      ),
      true,
      `missing lazy CSS chunk for ${chunkName}`,
    );
  }

  const md5Chunk = assets.find(
    (fileName) =>
      fileName.startsWith("md5-tool-") && fileName.endsWith(".js"),
  );
  const shaChunk = assets.find(
    (fileName) =>
      fileName.startsWith("sha-tool-") && fileName.endsWith(".js"),
  );
  assert.ok(md5Chunk);
  assert.ok(shaChunk);

  const [html, md5Source, shaSource] = await Promise.all([
    readFile(new URL("dist/index.html", projectRoot), "utf8"),
    readFile(new URL(`dist/assets/${md5Chunk}`, projectRoot), "utf8"),
    readFile(new URL(`dist/assets/${shaChunk}`, projectRoot), "utf8"),
  ]);
  const initialScripts = Array.from(
    html.matchAll(/<script[^>]+src="\/assets\/([^"]+\.js)"/g),
    (match) => match[1],
  );
  const initialSources = await Promise.all(
    initialScripts.map((fileName) =>
      readFile(new URL(`dist/assets/${fileName}`, projectRoot), "utf8"),
    ),
  );

  assert.equal((md5Source.match(/AGFzbQ/g) ?? []).length, 1);
  assert.doesNotMatch(md5Source, /sha1|sha256|sha512/i);
  assert.equal((shaSource.match(/AGFzbQ/g) ?? []).length, 3);
  assert.doesNotMatch(shaSource, /md5/i);
  for (const source of initialSources) {
    assert.doesNotMatch(source, /AGFzbQ/);
  }
});
