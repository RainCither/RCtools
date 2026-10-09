import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { projectRoot } from "./catalog.mts";
export type Violation = { file: string; message: string };
async function files(directory: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) =>
        entry.isDirectory()
          ? files(join(directory, entry.name))
          : /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")
            ? [join(directory, entry.name)]
            : [],
      ),
    )
  ).flat();
}
function part(file: string) {
  return file.replaceAll("\\", "/").split("/")[1] ?? "";
}
function portable(file: string) {
  return (
    file.startsWith("src/contracts/") ||
    (file.startsWith("src/tools/") &&
      file.endsWith(".ts") &&
      !file.endsWith("/worker.ts") &&
      !/\/use-[^/]+\.ts$/.test(file))
  );
}
function allowed(from: string, target: string) {
  const source = part(from),
    destination = part(target);
  if (source === "app") return true;
  if (source === "generated")
    return (
      destination === "contracts" ||
      destination === "tools" ||
      destination === "adapters" ||
      destination === "generated"
    );
  if (source === "contracts") return destination === "contracts";
  if (source === "catalog")
    return (
      destination === "contracts" ||
      (destination === "generated" && target.endsWith("/catalog.ts")) ||
      destination === "catalog"
    );
  if (source === "ui") return destination === "ui" || destination === "contracts";
  if (source === "bindings") return ["bindings", "contracts", "ui"].includes(destination);
  if (source === "adapters") return destination === "contracts" || destination === "adapters";
  if (source === "tools") {
    if (destination === "tools") {
      if (from.split("/")[2] !== target.split("/")[2]) return false;
      if (
        (portable(from) || from.endsWith("/worker.ts")) &&
        (target.endsWith(".tsx") || /\/use-[^/]+\.ts$/.test(target))
      )
        return false;
      return true;
    }
    if (destination === "contracts") return true;
    return (
      (from.endsWith("/view.tsx") || /\/use-[^/]+\.ts$/.test(from)) &&
      (destination === "ui" || destination === "bindings")
    );
  }
  return false;
}
export async function checkArchitecture(root = projectRoot): Promise<Violation[]> {
  const sourceFiles = await files(join(root, "src"));
  const paths = new Set(sourceFiles.map((file) => resolve(file)));
  const graph = new Map<string, string[]>();
  const violations: Violation[] = [];
  const config = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
  const compiler = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, root).options;
  for (const file of sourceFiles) {
    const name = relative(root, file).replaceAll("\\", "/");
    const source = ts.createSourceFile(
      file,
      await readFile(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const edges: string[] = [];
    function inspectImport(specifier: string, dynamic = false) {
      const resolved = ts.resolveModuleName(specifier, file, compiler, ts.sys).resolvedModule
        ?.resolvedFileName;
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
        if (portable(name) && /^(react|react-dom|react-router)(\/|$)/.test(specifier))
          violations.push({ file: name, message: `Portable module imports ${specifier}.` });
        if (!resolved || !paths.has(resolve(resolved))) return;
      }
      const base = specifier.startsWith("@/")
        ? join(root, "src", specifier.slice(2))
        : resolve(dirname(file), specifier);
      const target = [
        resolved ? resolve(resolved) : "",
        base,
        `${base}.ts`,
        `${base}.tsx`,
        join(base, "index.ts"),
      ].find((candidate) => paths.has(candidate));
      if (!target) return;
      const destination = relative(root, target).replaceAll("\\", "/");
      if (!allowed(name, destination))
        violations.push({ file: name, message: `Forbidden dependency: ${destination}.` });
      if (
        destination.startsWith("src/tools/") &&
        destination.endsWith("/view.tsx") &&
        name.startsWith("src/app/")
      )
        violations.push({
          file: name,
          message: "App must use the generated tool loading boundary.",
        });
      if (
        dynamic &&
        destination.startsWith("src/tools/") &&
        destination.endsWith("/view.tsx") &&
        !name.startsWith("src/generated/")
      )
        violations.push({
          file: name,
          message: "Tool views must be loaded through generated entries.",
        });
      edges.push(destination);
    }
    function visit(node: ts.Node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        inspectImport(node.moduleSpecifier.text);
      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      )
        inspectImport(node.argument.literal.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) inspectImport(argument.text, true);
        else violations.push({ file: name, message: "Computed imports bypass dependency checks." });
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      )
        violations.push({ file: name, message: "Use explicit ESM imports." });
      if (
        ts.isIdentifier(node) &&
        [
          "window",
          "document",
          "navigator",
          "localStorage",
          "sessionStorage",
          "File",
          "Blob",
          "FileReader",
          "Worker",
          "HTMLElement",
          "HTMLInputElement",
          "HTMLTextAreaElement",
        ].includes(node.text) &&
        portable(name)
      )
        violations.push({
          file: name,
          message: `Browser dependency ${node.text} in portable code.`,
        });
      if (
        ts.isPropertyAccessExpression(node) &&
        portable(name) &&
        node.expression.getText(source) === "Math" &&
        node.name.text === "random"
      )
        violations.push({ file: name, message: "Inject the random source into portable code." });
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "Worker" &&
        !name.startsWith("src/generated/") &&
        !name.startsWith("src/adapters/")
      )
        violations.push({
          file: name,
          message: "Create workers only through generated factories and adapters.",
        });
      ts.forEachChild(node, visit);
    }
    visit(source);
    graph.set(name, edges);
  }
  const visited = new Set<string>(),
    active = new Set<string>();
  function walk(name: string, chain: string[]) {
    if (active.has(name)) {
      violations.push({
        file: name,
        message: `Dependency cycle: ${[...chain, name].join(" -> ")}`,
      });
      return;
    }
    if (visited.has(name)) return;
    active.add(name);
    for (const edge of graph.get(name) ?? []) walk(edge, [...chain, name]);
    active.delete(name);
    visited.add(name);
  }
  for (const name of graph.keys()) walk(name, []);
  return violations;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const violations = await checkArchitecture();
  if (violations.length)
    throw new Error(violations.map((v) => `${v.file}: ${v.message}`).join("\n"));
  process.stdout.write("Architecture boundaries passed.\n");
}
