export type ParsedToolRoute<TToolId extends string> =
  | { kind: "home" }
  | { kind: "tool"; toolId: TToolId }
  | { kind: "invalid" };

export function normalizeBasePath(basePath: string): string {
  const segments = basePath.split("/").filter(Boolean);
  return segments.length ? `/${segments.join("/")}/` : "/";
}

export function getHomeHref(basePath = "/"): string {
  return normalizeBasePath(basePath);
}

export function getToolHref(toolId: string, basePath = "/"): string {
  return `${normalizeBasePath(basePath)}${toolId}/`;
}

export function parseToolRoute<TToolId extends string>(
  pathname: string,
  basePath: string,
  isToolId: (value: string) => value is TToolId,
): ParsedToolRoute<TToolId> {
  const normalizedBasePath = normalizeBasePath(basePath);
  const basePathWithoutSlash = normalizedBasePath.slice(0, -1) || "/";

  if (pathname === basePathWithoutSlash || pathname === normalizedBasePath) {
    return { kind: "home" };
  }

  if (!pathname.startsWith(normalizedBasePath)) {
    return { kind: "invalid" };
  }

  const segments = pathname
    .slice(normalizedBasePath.length)
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) return { kind: "home" };
  if (segments.length !== 1) return { kind: "invalid" };

  try {
    const candidate = decodeURIComponent(segments[0]);
    return isToolId(candidate)
      ? { kind: "tool", toolId: candidate }
      : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}
