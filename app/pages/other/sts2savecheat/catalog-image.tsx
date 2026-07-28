import { useState } from "react";
import { getCatalogImageUrl } from "./catalog-config";
import type { CatalogEntry } from "./types";

const MAX_IMAGE_ATTEMPTS = 2;

export function CatalogImage({
  className,
  entry,
}: {
  className?: string;
  entry: CatalogEntry;
}) {
  const source = getCatalogImageUrl(entry);
  const [attempt, setAttempt] = useState(0);
  const failed = attempt >= MAX_IMAGE_ATTEMPTS;

  if (failed) {
    return (
      <span
        aria-label={`${entry.name}图片加载失败`}
        className={className}
        role="img"
      >
        {entry.kind === "card" ? "卡" : "遗"}
      </span>
    );
  }

  return (
    <img
      alt={entry.name}
      className={className}
      decoding="async"
      loading="lazy"
      onError={() =>
        setAttempt((currentAttempt) => currentAttempt + 1)
      }
      referrerPolicy="no-referrer"
      src={attempt === 0 ? source : `${source}?retry=${attempt}`}
    />
  );
}
