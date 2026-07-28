import {
  getHomeHref,
  normalizeBasePath,
  parseToolRoute,
  type ParsedToolRoute,
} from "./tool-routes.ts";

export { getHomeHref };

export type ParsedAppRoute<
  TToolId extends string,
  TPageId extends string,
> =
  | Exclude<ParsedToolRoute<TToolId>, { kind: "invalid" }>
  | { kind: "page"; pageId: TPageId }
  | { kind: "invalid" };

export function getPageHref(pageId: string, basePath = "/"): string {
  return `${normalizeBasePath(basePath)}${pageId}/`;
}

export function parseAppRoute<
  TToolId extends string,
  TPageId extends string,
>(
  pathname: string,
  basePath: string,
  isToolId: (value: string) => value is TToolId,
  isPageId: (value: string) => value is TPageId,
): ParsedAppRoute<TToolId, TPageId> {
  const toolRoute = parseToolRoute(pathname, basePath, isToolId);

  if (toolRoute.kind !== "invalid") {
    return toolRoute;
  }

  const normalizedBasePath = normalizeBasePath(basePath);

  if (!pathname.startsWith(normalizedBasePath)) {
    return { kind: "invalid" };
  }

  const segments = pathname
    .slice(normalizedBasePath.length)
    .split("/")
    .filter(Boolean);

  if (segments.length !== 1) {
    return { kind: "invalid" };
  }

  try {
    const pageId = decodeURIComponent(segments[0]);

    return isPageId(pageId)
      ? { kind: "page", pageId }
      : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}
