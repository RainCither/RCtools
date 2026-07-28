import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalogRoot = new URL(
  "../app/pages/sts2saveedit/catalog/",
  import.meta.url,
);

async function readCatalog(name) {
  return JSON.parse(
    await readFile(new URL(`${name}.json`, catalogRoot), "utf8"),
  );
}

test("ships complete, unique and attributable Wiki catalogs", async () => {
  const [cards, relics] = await Promise.all([
    readCatalog("cards"),
    readCatalog("relics"),
  ]);

  assert.equal(cards.entries.length, 604);
  assert.equal(relics.entries.length, 298);
  assert.match(cards.sourceUrl, /sts2\.huijiwiki\.com/);
  assert.match(relics.sourceUrl, /sts2\.huijiwiki\.com/);
  assert.equal(cards.sourceVersion, "0.107.1");
  assert.equal(relics.sourceVersion, "0.107.1");

  for (const [catalog, namespace] of [
    [cards, "CARD"],
    [relics, "RELIC"],
  ]) {
    const ids = new Set();

    for (const entry of catalog.entries) {
      assert.match(
        entry.id,
        namespace === "CARD"
          ? /^CARD\.[A-Z0-9_]+(?:-[A-Z0-9_]+)*$/
          : /^RELIC\.[A-Z0-9_]+$/,
      );
      assert.equal(ids.has(entry.id), false, `duplicate ID: ${entry.id}`);
      ids.add(entry.id);
      assert.match(entry.sourceUrl, /^https:\/\/sts2\.huijiwiki\.com\/wiki\//);
      assert.match(entry.imagePath, /^\/sts2\/uploads\/thumb\/.+\.png$/);
      assert.notEqual(entry.name, "");
      assert.notEqual(entry.description, "");
    }
  }
});

test("keeps all variants from shared Wiki pages as separate IDs", async () => {
  const cards = await readCatalog("cards");
  const strikeEntries = cards.entries.filter((entry) => entry.name === "打击");

  assert.equal(strikeEntries.length > 1, true);
  assert.equal(
    strikeEntries.some((entry) => entry.id === "CARD.STRIKE_SILENT"),
    true,
  );
  assert.equal(
    strikeEntries.some((entry) => entry.id === "CARD.STRIKE_IRONCLAD"),
    true,
  );
});

test("ships a complete and attributable potion catalog", async () => {
  const potions = await readCatalog("potions");
  const ids = new Set();

  assert.equal(potions.entries.length, 63);
  assert.match(potions.sourceUrl, /sts2\.huijiwiki\.com/);
  assert.match(potions.dataSourceUrl, /spire-codex\.com\/api\/potions/);

  for (const entry of potions.entries) {
    assert.match(entry.id, /^POTION\.[A-Z0-9_]+$/);
    assert.equal(ids.has(entry.id), false, `duplicate ID: ${entry.id}`);
    ids.add(entry.id);
    assert.match(entry.sourceUrl, /^https:\/\/sts2\.huijiwiki\.com\/wiki\//);
    assert.notEqual(entry.name, "");
    assert.notEqual(entry.description, "");
    assert.notEqual(entry.pool, "");
    assert.notEqual(entry.rarity, "");
  }
});
