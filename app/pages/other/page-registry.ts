import type { ComponentType } from "react";
import { OTHER_PAGE_METADATA } from "./page-metadata";

type OtherPageModule = {
  default: ComponentType;
};

type OtherPageDefinition = {
  id: string;
  title: string;
  description: string;
  load: () => Promise<OtherPageModule>;
};

export const OTHER_PAGES = [
  {
    ...OTHER_PAGE_METADATA[0],
    load: () => import("./sts2savecheat-page"),
  },
] as const satisfies readonly OtherPageDefinition[];

export type OtherPageId = (typeof OTHER_PAGES)[number]["id"];

const OTHER_PAGE_BY_ID = new Map(
  OTHER_PAGES.map((page) => [page.id, page] as const),
);

export function isOtherPageId(value: string): value is OtherPageId {
  return OTHER_PAGE_BY_ID.has(value as OtherPageId);
}

export function findOtherPage(pageId: OtherPageId) {
  return OTHER_PAGE_BY_ID.get(pageId) ?? null;
}
