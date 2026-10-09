import type { CatalogEntry } from "../contracts/catalog-schema";
export type { CategoryId, ToolId } from "../generated/catalog";
export type CatalogData = Readonly<{
  entries: readonly CatalogEntry[];
  categories: readonly { id: string; label: string }[];
}>;
/** Queries serializable metadata, without navigation or implementation loading. */
export function createCatalog(data: CatalogData) {
  const entries = new Map(data.entries.map((entry) => [entry.id, entry]));
  const search = new Map(
    data.entries.map((entry) => [
      entry.id,
      [entry.title, entry.summary, ...entry.searchTerms].join(" ").toLocaleLowerCase("zh-CN"),
    ]),
  );
  return {
    entries: data.entries,
    categories: data.categories,
    findEntry(id: string) {
      return entries.get(id);
    },
    findTool(id: string) {
      const entry = entries.get(id);
      return entry?.kind === "tool" ? entry : undefined;
    },
    categoryLabel(id: string) {
      return data.categories.find((category) => category.id === id)?.label ?? "其他";
    },
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
