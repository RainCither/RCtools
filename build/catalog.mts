/** @file 扫描所有工具目录，校验 JSON、分类、ID 唯一性和入口文件大小写；生成工具目录、视图加载映射与 Worker 工厂。内容不变时避免重复写入。 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import * as v from "valibot";
import { CategorySchema, LinkSchema, ToolSchema } from "../src/contracts/catalog-schema.ts";
export const projectRoot = resolve(import.meta.dirname, "..");
/** 按 UTF-8 读取 file 并去除可选 BOM，返回解析后的未知 JSON 数据供 Schema 校验。 */
async function json(file: string) {
  return JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, "")) as unknown;
}
/** 仅在 file 的内容与 content 不同时写入，避免无变化的生成文件触发重复构建。 */
async function output(file: string, content: string) {
  await mkdir(dirname(file), { recursive: true });
  try {
    if ((await readFile(file, "utf8")) === content) return;
  } catch {
    /* 首次生成时目标文件尚不存在，继续写入已校验的配置。 */
  }
  await writeFile(file, content, "utf8");
}
/** 用 schema 校验 data，成功返回推导类型的配置；失败时附带 file 和字段路径定位问题。 */
function parse<T extends v.GenericSchema>(
  schema: T,
  data: unknown,
  file: string,
): v.InferOutput<T> {
  const result = v.safeParse(schema, data);
  if (!result.success)
    throw new Error(
      `${file}: ${result.issues.map((issue) => `${issue.path?.map((entry) => entry.key).join(".") ?? "config"}: ${issue.message}`).join("; ")}`,
    );
  return result.output;
}
/** 扫描 root 下的工具与目录配置，完整校验后返回排序后的工具、外链、分类和 Worker ID 集合。 */
export async function readCatalog(root = projectRoot) {
  const categories = parse(
    v.array(CategorySchema),
    await json(join(root, "src/catalog/categories.json")),
    "categories.json",
  );
  if (new Set(categories.map((category) => category.id)).size !== categories.length)
    throw new Error("Duplicate category id.");
  const tools = [];
  const workers = new Set<string>();
  for (const entry of await readdir(join(root, "src/tools"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(root, "src/tools", entry.name, "tool.json");
    const tool = parse(ToolSchema, await json(file), file);
    if (tool.id !== entry.name) throw new Error(`${file}: id must match directory ${entry.name}.`);
    const names = await readdir(dirname(file));
    if (!names.includes("view.tsx"))
      throw new Error(`${file}: missing case-sensitive view.tsx entry.`);
    for (const conventional of ["core.ts", "controller.ts", "worker.ts"])
      if (
        names.some((name) => name.toLowerCase() === conventional) &&
        !names.includes(conventional)
      )
        throw new Error(`${file}: incorrect case for ${conventional}.`);
    if (names.includes("worker.ts")) workers.add(tool.id);
    tools.push({ ...tool, kind: "tool" as const });
  }
  const links = parse(
    v.array(LinkSchema),
    await json(join(root, "src/catalog/links.json")),
    "links.json",
  ).map((link) => ({ ...link, kind: "link" as const }));
  // 工具与外链共享全局 ID 命名空间，重复 ID 会破坏目录查找和最近使用。
  const entries = [...tools, ...links];
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length)
    throw new Error("Tool and link ids must be globally unique.");
  for (const entry of entries)
    if (!categories.some((category) => category.id === entry.category))
      throw new Error(`${entry.id}: unknown category ${entry.category}.`);
  tools.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "en"));
  links.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "en"));
  if (!tools.length) throw new Error("At least one tool is required.");
  return { tools, links, categories, workers };
}
/** 根据 root 的合法配置生成目录、视图加载器和 Worker 工厂，返回用于预渲染的工具列表。 */
export async function generateCatalog(root = projectRoot) {
  // 全部配置校验成功后才进入写入阶段，错误配置不会覆盖上一份合法生成文件。
  const { tools, links, categories, workers } = await readCatalog(root);
  const header = "// 根据 JSON 配置自动生成；请修改配置或生成器，不要手工编辑。\n";
  await output(
    join(root, "src/generated/catalog.ts"),
    `${header}import type { CatalogEntry } from "../contracts/catalog-schema";\nexport const TOOLS = ${JSON.stringify(tools, null, 2)} as const satisfies readonly CatalogEntry[];\nexport const LINKS = ${JSON.stringify(links, null, 2)} as const satisfies readonly CatalogEntry[];\nexport const CATEGORIES = ${JSON.stringify(categories, null, 2)} as const;\nexport const TOOL_IDS = ${JSON.stringify(tools.map((tool) => tool.id))} as const;\nexport type ToolId = (typeof TOOL_IDS)[number];\nexport type CategoryId = (typeof CATEGORIES)[number]["id"];\n`,
  );
  await output(
    join(root, "src/generated/tool-loaders.ts"),
    `${header}import type { ComponentType } from "react";\nimport type { ToolId } from "./catalog";\nexport const TOOL_LOADERS = {\n${tools.map((tool) => `  ${JSON.stringify(tool.id)}: () => import("../tools/${tool.id}/view"),`).join("\n")}\n} satisfies Record<ToolId, () => Promise<{ default: ComponentType }>>;\n`,
  );
  await output(
    join(root, "src/generated/worker-factories.ts"),
    `${header}import type { WorkerFactory } from "../contracts/ports";\nimport type { ToolId } from "./catalog";\nimport { adaptWorker } from "../adapters/worker";\nexport const WORKER_FACTORIES = {\n${tools
      .filter((tool) => workers.has(tool.id))
      .map(
        (tool) =>
          `  ${JSON.stringify(tool.id)}: () => adaptWorker(new Worker(new URL("../tools/${tool.id}/worker.ts", import.meta.url), { type: "module" })),`,
      )
      .join("\n")}\n} satisfies Partial<Record<ToolId, WorkerFactory>>;\n`,
  );
  return tools;
}
