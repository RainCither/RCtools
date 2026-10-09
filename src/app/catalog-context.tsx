import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { CatalogData } from "../catalog";
import { createCatalog } from "../catalog";
const CatalogContext = createContext<ReturnType<typeof createCatalog> | null>(null);
export function CatalogProvider({ data, children }: { data: CatalogData; children: ReactNode }) {
  const catalog = useMemo(() => createCatalog(data), [data]);
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}
export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("Catalog provider missing");
  return catalog;
}
