import type { CatalogData } from "../catalog";
import { CATEGORIES, LINKS, TOOLS } from "../generated/catalog";
export const catalogData = {
  entries: [...TOOLS, ...LINKS].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "en")),
  categories: CATEGORIES,
} satisfies CatalogData;
