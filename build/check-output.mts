import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import ts from "typescript";
import { projectRoot, readCatalog } from "./catalog.mts";
import { site } from "./site.mts";
export async function checkOutput(root = projectRoot) {
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#x27;");
  const output = join(root, "dist/client");
  const { tools } = await readCatalog(root);
  const home = await readFile(join(output, "index.html"), "utf8");
  if (!home.includes("全部工具") || !home.includes(tools[0]?.title ?? ""))
    throw new Error("Homepage must contain prerendered catalog content.");
  for (const tool of tools) {
    const html = await readFile(join(output, tool.id, "index.html"), "utf8");
    if (
      !html.includes(`<title>${escape(tool.title)}｜工具匣</title>`) ||
      !html.includes(escape(tool.summary))
    )
      throw new Error(`Missing prerendered content for ${tool.id}.`);
    if (!html.includes("正在加载工具"))
      throw new Error(`Missing client-only placeholder for ${tool.id}.`);
    for (const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
      const resource = match[1];
      if (resource?.startsWith(`${site.assetBase}assets/`))
        await access(join(output, resource.slice(site.assetBase.length)));
    }
  }
  const assets = await readdir(join(output, "assets"));
  if (!assets.some((file) => file.endsWith(".js"))) throw new Error("Missing JavaScript output.");
  const initial = new Set<string>();
  async function add(file: string) {
    if (initial.has(file)) return;
    initial.add(file);
    const source = await readFile(join(output, file), "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    for (const statement of ast.statements) {
      if (
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const imported = statement.moduleSpecifier.text;
        if (imported.startsWith("."))
          await add(
            relative(output, resolve(output, dirname(file), imported)).replaceAll("\\", "/"),
          );
      }
    }
  }
  for (const match of home.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+\.js)"/g)) {
    const path = match[1];
    if (path?.startsWith(site.assetBase)) await add(path.slice(site.assetBase.length));
  }
  for (const match of home.matchAll(/\bimport\s*(?:\(\s*)?["']([^"']+\.js)["']/g)) {
    const path = match[1];
    if (path?.startsWith(site.assetBase)) await add(path.slice(site.assetBase.length));
  }
  const report = JSON.parse(await readFile(join(output, "bundle-report.json"), "utf8")) as Record<
    string,
    string[]
  >;
  let bytes = 0;
  for (const file of initial) {
    const source = await readFile(join(output, file), "utf8");
    bytes += gzipSync(source).length;
    if (
      (report[file] ?? []).some(
        (module) =>
          module.startsWith("src/tools/") ||
          /node_modules\/(?:prettier|hash-wasm|csso|terser|parse5|postcss)\//.test(module),
      )
    )
      throw new Error(`Tool or heavy dependency in initial asset ${file}.`);
  }
  if (bytes > 100 * 1024) throw new Error(`Initial JS gzip exceeds 100 KiB: ${bytes}.`);
  await Promise.all(
    ["404.html", ".nojekyll", "tool-routes.json", "build-info.json", "_.data"].map((file) =>
      access(join(output, file)),
    ),
  );
  if (site.domain) await access(join(output, "CNAME"));
  else if ((await readdir(output)).includes("CNAME"))
    throw new Error("Unexpected CNAME without a domain.");
  process.stdout.write(
    `Verified ${tools.length} prerendered tool routes; initial JavaScript gzip ${(bytes / 1024).toFixed(1)} KiB.\n`,
  );
  return { tools: tools.length, initialGzipBytes: bytes };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename))
  await checkOutput();
