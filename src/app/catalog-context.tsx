/** @file 通过 React Context 向页面提供目录查询能力，封装 CatalogProvider 和 useCatalog()。 */
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { CatalogData } from "../catalog";
import { createCatalog } from "../catalog";
const CatalogContext = createContext<ReturnType<typeof createCatalog> | null>(null);
/** 根据 data 建立可复用目录查询对象，通过 Context 提供给 children 中的页面。 */
export function CatalogProvider({ data, children }: { data: CatalogData; children: ReactNode }) {
  const catalog = useMemo(() => createCatalog(data), [data]);
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}
/** 读取当前目录查询服务，缺少 Provider 时抛出明确错误，避免页面使用不完整上下文。 */
export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("Catalog provider missing");
  return catalog;
}
