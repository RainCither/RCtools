/** @file 将生成的工具、外链和分类组合为根路由所需的目录数据，并按排序值和 ID 排序。 */
import type { CatalogData } from "../catalog";
import { CATEGORIES, LINKS, TOOLS } from "../generated/catalog";
export const catalogData = {
  entries: [...TOOLS, ...LINKS].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "en")),
  categories: CATEGORIES,
} satisfies CatalogData;
