/** @file 验证目录扫描、工具顺序、草稿策略、自动发现、配置错误及架构检查器对别名、转导出、动态导入和循环依赖的识别。 */
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { expect, it } from "vitest";
import { generateCatalog, readCatalog } from "../../build/catalog.mts";
import { checkArchitecture } from "../../build/check-architecture.mts";
/** 确认 root 是本次测试创建的临时目录后删除，避免测试清理误伤其他文件。 */
async function removeFixture(root: string) {
  if (dirname(resolve(root)) !== resolve(tmpdir()) || !root.startsWith(join(tmpdir(), "rctools-")))
    throw new Error("Unsafe fixture path");
  await rm(root, { recursive: true, force: true });
}
/** 验证全部工具的 ID、排序和草稿策略与目录约定一致。 */
it("reads all migrated tools with deterministic ordering and safe policies", async () => {
  const catalog = await readCatalog();
  const compatibility = [
    "json",
    "css-formatter",
    "js-formatter",
    "html-formatter",
    "regex",
    "timestamp",
    "time-diff",
    "text-stats",
    "glitch-text",
    "password",
    "base64",
    "md5",
    "sha",
    "base-converter",
    "ieee-754",
    "color",
  ];
  expect(catalog.tools.map((tool) => tool.id).filter((id) => compatibility.includes(id))).toEqual(
    compatibility,
  );
  expect(catalog.tools.find((tool) => tool.id === "password")?.draft).toBe("none");
  expect(await checkArchitecture()).toEqual([]);
});
/** 创建工具夹具，验证自动发现以及非法配置不会替换上一份合法生成结果。 */
it("discovers a new tool without a central registration edit and rejects invalid config", async () => {
  const root = await mkdtemp(join(tmpdir(), "rctools-catalog-"));
  try {
    await mkdir(join(root, "src/catalog"), { recursive: true });
    await mkdir(join(root, "src/tools/example"), { recursive: true });
    await writeFile(
      join(root, "src/catalog/categories.json"),
      '[{"id":"dev","label":"开发"}]',
      "utf8",
    );
    await writeFile(join(root, "src/catalog/links.json"), "[]", "utf8");
    await writeFile(
      join(root, "src/tools/example/view.tsx"),
      "export default function Example(){return null}",
      "utf8",
    );
    const valid = {
      id: "example",
      title: "Example",
      summary: "Example tool",
      category: "dev",
      mark: "E",
      searchTerms: ["example"],
      order: 10,
    };
    const config = join(root, "src/tools/example/tool.json");
    await writeFile(config, JSON.stringify(valid), "utf8");
    await generateCatalog(root);
    const generated = await readFile(join(root, "src/generated/catalog.ts"), "utf8");
    expect(generated).toContain("example");
    await writeFile(config, JSON.stringify({ ...valid, category: "missing" }), "utf8");
    await expect(generateCatalog(root)).rejects.toThrow("unknown category");
    expect(await readFile(join(root, "src/generated/catalog.ts"), "utf8")).toBe(generated);
    await writeFile(config, JSON.stringify({ ...valid, id: "wrong" }), "utf8");
    await expect(readCatalog(root)).rejects.toThrow("must match");
    await writeFile(config, JSON.stringify({ ...valid, title: "" }), "utf8");
    await expect(readCatalog(root)).rejects.toThrow("title");
    await writeFile(config, JSON.stringify(valid), "utf8");
    await writeFile(
      join(root, "src/catalog/links.json"),
      JSON.stringify([{ ...valid, href: "https://example.com" }]),
      "utf8",
    );
    await expect(readCatalog(root)).rejects.toThrow("globally unique");
    await writeFile(join(root, "src/catalog/links.json"), "[]", "utf8");
    await rename(
      join(root, "src/tools/example/view.tsx"),
      join(root, "src/tools/example/View.tsx"),
    );
    await expect(readCatalog(root)).rejects.toThrow("case-sensitive");
    await rename(
      join(root, "src/tools/example/View.tsx"),
      join(root, "src/tools/example/view.tsx"),
    );
    await writeFile(join(root, "src/tools/example/Worker.ts"), "", "utf8");
    await expect(readCatalog(root)).rejects.toThrow("incorrect case");
    await rm(join(root, "src/tools/example/Worker.ts"));
    await mkdir(join(root, "src/tools/alpha"));
    await writeFile(
      join(root, "src/tools/alpha/view.tsx"),
      "export default function Alpha(){return null}",
      "utf8",
    );
    await writeFile(
      join(root, "src/tools/alpha/tool.json"),
      JSON.stringify({ ...valid, id: "alpha" }),
      "utf8",
    );
    expect((await readCatalog(root)).tools.map((tool) => tool.id)).toEqual(["alpha", "example"]);
  } finally {
    await removeFixture(root);
  }
});
/** 验证架构检查覆盖别名、转导出、动态导入、可移植辅助函数与循环。 */
it("checks aliases, re-exports, dynamic imports, portable helpers and cycles", async () => {
  const root = await mkdtemp(join(tmpdir(), "rctools-architecture-"));
  try {
    const fixtures: Record<string, string> = {
      "tsconfig.json": JSON.stringify({
        compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } },
      }),
      "src/tools/alpha/core.ts": "export { value } from '@/tools/beta/core';",
      "src/tools/alpha/helper.ts": "export const value = window.location;",
      "src/tools/beta/core.ts": "export const value = 1;",
      "src/tools/beta/view.tsx": "export default function Tool(){return null}",
      "src/ui/view.ts": 'export { value } from "../tools/beta/core";',
      "src/app/entry.ts": "export const load = () => import('@/tools/beta/view');",
      "src/contracts/a.ts": 'import "./b";',
      "src/contracts/b.ts": 'import "./a";',
    };
    for (const [file, content] of Object.entries(fixtures)) {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await writeFile(join(root, file), content, "utf8");
    }
    const errors = await checkArchitecture(root);
    expect(
      errors.some(
        (error) => error.file === "src/tools/alpha/core.ts" && error.message.includes("Forbidden"),
      ),
    ).toBe(true);
    expect(
      errors.some(
        (error) => error.file === "src/tools/alpha/helper.ts" && error.message.includes("Browser"),
      ),
    ).toBe(true);
    expect(
      errors.some(
        (error) => error.file === "src/ui/view.ts" && error.message.includes("Forbidden"),
      ),
    ).toBe(true);
    expect(errors.some((error) => error.message.includes("generated"))).toBe(true);
    expect(errors.some((error) => error.message.includes("cycle"))).toBe(true);
  } finally {
    await removeFixture(root);
  }
});
