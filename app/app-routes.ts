import {
  getHomeHref,
  normalizeBasePath,
  parseToolRoute,
  type ParsedToolRoute,
} from "./tool-routes.ts";

export { getHomeHref };

export type ParsedAppRoute<
  TToolId extends string,
  TOtherPageId extends string,
> =
  | Exclude<ParsedToolRoute<TToolId>, { kind: "invalid" }>
  | { kind: "other-page"; pageId: TOtherPageId }
  | { kind: "invalid" };

export function getOtherPageHref(pageId: string, basePath = "/"): string {
  return `${normalizeBasePath(basePath)}other/${pageId}/`;
}

export function parseAppRoute<
  TToolId extends string,
  TOtherPageId extends string,
>(
  pathname: string,
  basePath: string,
  isToolId: (value: string) => value is TToolId,
  isOtherPageId: (value: string) => value is TOtherPageId,
): ParsedAppRoute<TToolId, TOtherPageId> {
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

  if (segments.length !== 2) {
    return { kind: "invalid" };
  }

  try {
    const namespace = decodeURIComponent(segments[0]);
    const pageId = decodeURIComponent(segments[1]);

    return namespace === "other" && isOtherPageId(pageId)
      ? { kind: "other-page", pageId }
      : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}
