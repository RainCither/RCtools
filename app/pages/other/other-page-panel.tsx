import { lazy, Suspense } from "react";
import { OTHER_PAGES, type OtherPageId } from "./page-registry";

const OTHER_PAGE_COMPONENTS = new Map(
  OTHER_PAGES.map((page) => [page.id, lazy(page.load)] as const),
);

export function OtherPagePanel({ pageId }: { pageId: OtherPageId }) {
  const Page = OTHER_PAGE_COMPONENTS.get(pageId);

  if (!Page) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}
