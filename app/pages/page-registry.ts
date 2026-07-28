import type { ComponentType } from "react";
import { PAGE_METADATA } from "./page-metadata";

type PageModule = {
  default: ComponentType;
};

type PageDefinition = {
  id: string;
  title: string;
  description: string;
  load: () => Promise<PageModule>;
};

export const PAGES = [
  {
    ...PAGE_METADATA[0],
    load: () => import("./sts2saveedit-page"),
  },
] as const satisfies readonly PageDefinition[];

export type PageId = (typeof PAGES)[number]["id"];

const PAGE_BY_ID = new Map(
  PAGES.map((page) => [page.id, page] as const),
);

export function isPageId(value: string): value is PageId {
  return PAGE_BY_ID.has(value as PageId);
}

export function findPage(pageId: PageId) {
  return PAGE_BY_ID.get(pageId) ?? null;
}
