import type { CatalogEntry, CatalogFile, PotionCatalogFile } from "./types";

export const STS2_WIKI_BASE_URL = "https://sts2.huijiwiki.com";

export const STS2_IMAGE_BASE_URL = "https://huiji-thumb.huijistatic.com";

export function getCatalogImageUrl(entry: CatalogEntry) {
  return `${STS2_IMAGE_BASE_URL.replace(/\/$/, "")}${entry.imagePath}`;
}

export async function loadCardCatalog(): Promise<CatalogFile> {
  const module = await import("./catalog/cards.json");
  return module.default as CatalogFile;
}

export async function loadRelicCatalog(): Promise<CatalogFile> {
  const module = await import("./catalog/relics.json");
  return module.default as CatalogFile;
}

export async function loadPotionCatalog(): Promise<PotionCatalogFile> {
  const module = await import("./catalog/potions.json");
  return module.default as PotionCatalogFile;
}
