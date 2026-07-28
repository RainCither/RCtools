import { lazy, Suspense } from "react";
import { PAGES, type PageId } from "./page-registry";

const PAGE_COMPONENTS = new Map(
  PAGES.map((page) => [page.id, lazy(page.load)] as const),
);

export function PagePanel({ pageId }: { pageId: PageId }) {
  const Page = PAGE_COMPONENTS.get(pageId);

  if (!Page) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}
