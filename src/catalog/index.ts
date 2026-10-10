/** @file 提供纯目录查询：按 ID 查找条目或工具、查分类名称、按关键词和分类筛选；同时导出工具和分类类型。 */
import type { CatalogEntry } from "../contracts/catalog-schema";
export type { CategoryId, ToolId } from "../generated/catalog";
/** 可序列化目录数据：包含按显示顺序排列的条目及分类，供预渲染和客户端查询共用。 */
export type CatalogData = Readonly<{
  entries: readonly CatalogEntry[];
  categories: readonly { id: string; label: string }[];
}>;
/** 根据 data 中的描述数据建立查询索引，返回工具查找、分类名称和搜索筛选方法。 */
export function createCatalog(data: CatalogData) {
  const entries = new Map(data.entries.map((entry) => [entry.id, entry]));
  // 预先合并标题、简介和关键词，筛选时复用索引并保持目录原始排序。
  const search = new Map(
    data.entries.map((entry) => [
      entry.id,
      [entry.title, entry.summary, ...entry.searchTerms].join(" ").toLocaleLowerCase("zh-CN"),
    ]),
  );
  return {
    entries: data.entries,
    categories: data.categories,
    /** 按 id 返回工具或外链描述，未知 ID 返回空值供调用方过滤。 */
    findEntry(id: string) {
      return entries.get(id);
    },
    /** 按 id 读取目录并只返回内部工具，避免外链被当作本地工具页面加载。 */
    findTool(id: string) {
      const entry = entries.get(id);
      return entry?.kind === "tool" ? entry : undefined;
    },
    /** 将分类 id 转为显示名称，未知分类使用统一兜底名称。 */
    categoryLabel(id: string) {
      return data.categories.find((category) => category.id === id)?.label ?? "其他";
    },
    /** 按 query 和 category 筛选预建搜索索引，返回保持目录排序的匹配条目。 */
    filterEntries(query: string, category: string) {
      const value = query.trim().toLocaleLowerCase("zh-CN");
      return data.entries.filter(
        (entry) =>
          (category === "all" || category === entry.category) &&
          (!value || search.get(entry.id)?.includes(value)),
      );
    },
  };
}
