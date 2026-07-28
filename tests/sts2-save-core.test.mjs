import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ENCHANTMENTS } from "../app/pages/other/sts2savecheat/enchantments.ts";
import {
  cloneSts2Save,
  countInventory,
  getModifiedSaveName,
  hasStructuralValidationErrors,
  hasValidationErrors,
  normalizeInventoryId,
  parseSts2Save,
  serializeSts2Save,
  setCardEnchantment,
  setCardUpgradeLevel,
  setInventoryCount,
  setMapNodeType,
  setPotionAtSlot,
  updateAscension,
  updatePlayerNumber,
  validateSts2Save,
} from "../app/pages/other/sts2savecheat/save-core.ts";

const fixtureUrl = new URL(
  "fixtures/sts2-schema14-minimal.save",
  import.meta.url,
);

async function loadFixture() {
  return parseSts2Save(await readFile(fixtureUrl, "utf8"));
}

test("parses UTF-8 schema 14 saves, including a BOM", async () => {
  const source = await readFile(fixtureUrl, "utf8");
  const save = parseSts2Save(`\uFEFF${source}`);

  assert.equal(save.schema_version, 14);
  assert.equal(save.players.length, 2);
  assert.deepEqual(validateSts2Save(save), []);
});

test("reports parse failures, unsupported versions and missing fields", async () => {
  assert.throws(() => parseSts2Save("{bad json"), /不是有效的 UTF-8 JSON/);
  assert.throws(() => parseSts2Save("[]"), /根节点必须是 JSON 对象/);

  const save = await loadFixture();
  const unsupported = cloneSts2Save(save);
  unsupported.schema_version = 15;
  const versionIssues = validateSts2Save(unsupported);
  assert.equal(
    versionIssues.some((issue) => issue.code === "schema.unsupported"),
    true,
  );
  assert.equal(hasValidationErrors(versionIssues), true);
  assert.equal(hasStructuralValidationErrors(versionIssues), false);
  assert.throws(() => serializeSts2Save(unsupported), /无法导出/);

  const missing = cloneSts2Save(save);
  delete missing.players[0].deck;
  const missingIssues = validateSts2Save(missing);
  assert.equal(
    missingIssues.some((issue) => issue.path === "players[0].deck"),
    true,
  );
  assert.equal(hasStructuralValidationErrors(missingIssues), true);
});

test("validates number bounds and strict raw IDs", async () => {
  const save = await loadFixture();
  const invalidHp = cloneSts2Save(save);
  invalidHp.players[0].current_hp = 71;
  assert.equal(
    validateSts2Save(invalidHp).some(
      (issue) => issue.code === "player.hp.exceeds_max",
    ),
    true,
  );

  assert.equal(
    normalizeInventoryId(" card.strike_silent ", "deck"),
    "CARD.STRIKE_SILENT",
  );
  assert.equal(
    normalizeInventoryId("relic.ring_of_the_snake", "relics"),
    "RELIC.RING_OF_THE_SNAKE",
  );
  assert.throws(
    () => normalizeInventoryId("CARD.BAD-ID", "deck"),
    /CARD\.\[A-Z0-9_\]\+/,
  );
  assert.throws(() => updatePlayerNumber(save, 0, "max_hp", 0), /至少为 1/);

  const invalidUpgrade = cloneSts2Save(save);
  invalidUpgrade.players[0].deck[0].current_upgrade_level = -1;
  assert.equal(
    validateSts2Save(invalidUpgrade).some(
      (issue) => issue.code === "card.upgrade.invalid",
    ),
    true,
  );

  const invalidEnchantment = cloneSts2Save(save);
  invalidEnchantment.players[0].deck[0].enchantment = {
    amount: 0,
    id: "BAD.ENCHANTMENT",
  };
  const enchantmentIssues = validateSts2Save(invalidEnchantment);
  assert.equal(
    enchantmentIssues.some(
      (issue) => issue.code === "card.enchantment.id.invalid",
    ),
    true,
  );
  assert.equal(
    enchantmentIssues.some(
      (issue) => issue.code === "card.enchantment.amount.invalid",
    ),
    true,
  );

  const invalidAscension = cloneSts2Save(save);
  invalidAscension.ascension = -1;
  assert.equal(
    validateSts2Save(invalidAscension).some(
      (issue) => issue.code === "save.ascension.invalid",
    ),
    true,
  );

  const duplicatePotionSlot = cloneSts2Save(save);
  duplicatePotionSlot.players[0].potions.push({
    id: "POTION.STRENGTH_POTION",
    slot_index: 0,
  });
  assert.equal(
    validateSts2Save(duplicatePotionSlot).some(
      (issue) => issue.code === "potion.slot.duplicate",
    ),
    true,
  );
});

test("edits cards and relics without mutating the imported object", async () => {
  const original = await loadFixture();
  const downgraded = setCardUpgradeLevel(
    original,
    0,
    "CARD.STRIKE_SILENT",
    1,
    0,
  );
  const upgradedAgain = setCardUpgradeLevel(
    downgraded,
    0,
    "CARD.STRIKE_SILENT",
    0,
    1,
  );
  const withBaseVariant = setInventoryCount(
    original,
    0,
    "deck",
    "CARD.STRIKE_SILENT",
    1,
    0,
  );
  const withCard = setInventoryCount(
    original,
    0,
    "deck",
    "CARD.DEFEND_SILENT",
    2,
  );
  const withRelic = setInventoryCount(withCard, 1, "relics", "RELIC.ANCHOR", 1);

  assert.equal(original.players[0].deck.length, 1);
  assert.equal(original.players[0].deck[0].current_upgrade_level, 1);
  assert.equal(
    Object.hasOwn(downgraded.players[0].deck[0], "current_upgrade_level"),
    false,
  );
  assert.equal(
    downgraded.players[0].deck[0].future_card_field,
    "preserve-card",
  );
  assert.equal(upgradedAgain.players[0].deck[0].current_upgrade_level, 1);
  assert.deepEqual(
    countInventory(withBaseVariant.players[0].deck, "deck").map(
      ({ count, id, upgradeLevel }) => ({ count, id, upgradeLevel }),
    ),
    [
      { count: 1, id: "CARD.STRIKE_SILENT", upgradeLevel: 1 },
      { count: 1, id: "CARD.STRIKE_SILENT", upgradeLevel: 0 },
    ],
  );
  assert.equal(withBaseVariant.players[0].deck.length, 2);
  assert.equal(
    withBaseVariant.players[0].deck.filter(
      (entry) =>
        entry.id === "CARD.STRIKE_SILENT" && entry.current_upgrade_level === 1,
    ).length,
    1,
  );
  assert.equal(
    withBaseVariant.players[0].deck.filter(
      (entry) =>
        entry.id === "CARD.STRIKE_SILENT" &&
        entry.current_upgrade_level === undefined,
    ).length,
    1,
  );
  assert.equal(original.players[1].relics.length, 1);
  assert.deepEqual(withCard.players[0].deck.slice(-2), [
    { floor_added_to_deck: 3, id: "CARD.DEFEND_SILENT" },
    { floor_added_to_deck: 3, id: "CARD.DEFEND_SILENT" },
  ]);
  assert.equal(withRelic.players[1].relics.at(-1).floor_added_to_deck, 3);

  const removed = setInventoryCount(
    withRelic,
    0,
    "deck",
    "CARD.DEFEND_SILENT",
    0,
  );
  assert.equal(
    removed.players[0].deck.some((entry) => entry.id === "CARD.DEFEND_SILENT"),
    false,
  );
});

test("edits one card enchantment and keeps card variants separate", async () => {
  const original = await loadFixture();
  original.players[0].deck.push({
    current_upgrade_level: 1,
    floor_added_to_deck: 2,
    id: "CARD.STRIKE_SILENT",
    second_copy_field: "preserve-second",
  });
  const royallyApproved = {
    amount: 1,
    id: "ENCHANTMENT.ROYALLY_APPROVED",
  };
  const enchanted = setCardEnchantment(
    original,
    0,
    "CARD.STRIKE_SILENT",
    1,
    null,
    royallyApproved,
  );

  assert.equal(original.players[0].deck[0].enchantment, undefined);
  assert.deepEqual(enchanted.players[0].deck[0].enchantment, royallyApproved);
  assert.equal(enchanted.players[0].deck[0].future_card_field, "preserve-card");
  assert.deepEqual(
    countInventory(enchanted.players[0].deck, "deck").map(
      ({ count, enchantment, id, upgradeLevel }) => ({
        count,
        enchantment,
        id,
        upgradeLevel,
      }),
    ),
    [
      {
        count: 1,
        enchantment: royallyApproved,
        id: "CARD.STRIKE_SILENT",
        upgradeLevel: 1,
      },
      {
        count: 1,
        enchantment: null,
        id: "CARD.STRIKE_SILENT",
        upgradeLevel: 1,
      },
    ],
  );

  const duplicatedEnchantment = setInventoryCount(
    enchanted,
    0,
    "deck",
    "CARD.STRIKE_SILENT",
    2,
    1,
    royallyApproved,
  );
  const duplicatedVariants = countInventory(
    duplicatedEnchantment.players[0].deck,
    "deck",
  );
  assert.equal(
    duplicatedVariants.find(
      (entry) => entry.enchantment?.id === "ENCHANTMENT.ROYALLY_APPROVED",
    ).count,
    2,
  );
  assert.equal(
    duplicatedVariants.find((entry) => entry.enchantment === null).count,
    1,
  );

  const stronger = setCardEnchantment(
    enchanted,
    0,
    "CARD.STRIKE_SILENT",
    1,
    royallyApproved,
    {
      amount: 3,
      id: "ENCHANTMENT.ROYALLY_APPROVED",
    },
  );
  assert.equal(stronger.players[0].deck[0].enchantment.amount, 3);
  assert.equal(stronger.players[0].deck[0].future_card_field, "preserve-card");

  const removed = setCardEnchantment(
    stronger,
    0,
    "CARD.STRIKE_SILENT",
    1,
    {
      amount: 3,
      id: "ENCHANTMENT.ROYALLY_APPROVED",
    },
    null,
  );
  assert.equal(removed.players[0].deck[0].enchantment, undefined);

  assert.equal(ENCHANTMENTS.length, 22);
  assert.equal(
    new Set(ENCHANTMENTS.map((entry) => entry.id)).size,
    ENCHANTMENTS.length,
  );
  assert.equal(
    ENCHANTMENTS.every((entry) => /^ENCHANTMENT\.[A-Z0-9_]+$/.test(entry.id)),
    true,
  );
});

test("edits misc values and current map nodes while locking start and boss", async () => {
  const original = await loadFixture();
  original.acts[1].saved_map = structuredClone(original.acts[0].saved_map);
  original.acts[1].saved_map.points[0].type = "elite";
  const withGold = updatePlayerNumber(original, 1, "gold", 777);
  const withMap = setMapNodeType(withGold, 0, 1, "shop");

  assert.equal(original.players[1].gold, 12);
  assert.equal(withGold.players[1].gold, 777);
  assert.equal(withMap.acts[0].saved_map.points[0].type, "shop");
  assert.equal(withMap.acts[1].saved_map.points[0].type, "elite");
  assert.equal(
    withMap.acts[0].saved_map.points[0].future_node_field,
    "preserve-node",
  );

  const withSecondActCurrent = cloneSts2Save(withMap);
  withSecondActCurrent.current_act_index = 1;
  const withCurrentMapChanged = setMapNodeType(
    withSecondActCurrent,
    0,
    1,
    "treasure",
  );
  assert.equal(withCurrentMapChanged.acts[0].saved_map.points[0].type, "shop");
  assert.equal(
    withCurrentMapChanged.acts[1].saved_map.points[0].type,
    "treasure",
  );

  assert.throws(
    () => setMapNodeType(withMap, 1, 0, "unknown"),
    /只能修改普通地图节点/,
  );
  assert.throws(
    () => setMapNodeType(withMap, 1, 1, "boss"),
    /不支持该地图节点类型/,
  );

  const withoutCurrentMap = cloneSts2Save(withMap);
  withoutCurrentMap.current_act_index = 2;
  assert.throws(
    () => setMapNodeType(withoutCurrentMap, 0, 1, "shop"),
    /当前章节尚未生成可编辑地图/,
  );
});

test("edits ascension and potion slots while preserving unknown potion fields", async () => {
  const original = await loadFixture();
  const withAscension = updateAscension(original, 7);
  const replaced = setPotionAtSlot(
    withAscension,
    0,
    0,
    "potion.strength_potion",
  );
  const added = setPotionAtSlot(replaced, 0, 1, "POTION.REGEN_POTION");
  const removed = setPotionAtSlot(added, 0, 0, null);

  assert.equal(original.ascension, 4);
  assert.equal(withAscension.ascension, 7);
  assert.equal(original.players[0].potions[0].id, "POTION.FLEX_POTION");
  assert.deepEqual(replaced.players[0].potions[0], {
    future_potion_field: "preserve-potion",
    id: "POTION.STRENGTH_POTION",
    slot_index: 0,
  });
  assert.deepEqual(added.players[0].potions[1], {
    id: "POTION.REGEN_POTION",
    slot_index: 1,
  });
  assert.deepEqual(removed.players[0].potions, [
    {
      id: "POTION.REGEN_POTION",
      slot_index: 1,
    },
  ]);
  assert.throws(() => updateAscension(original, -1), /非负安全整数/);
  assert.throws(
    () => setPotionAtSlot(original, 0, 2, "POTION.REGEN_POTION"),
    /超出当前药水槽数量/,
  );
  assert.throws(() => setPotionAtSlot(original, 0, 1, "RELIC.BAD"), /POTION\./);
});

test("round-trips four editor areas and preserves every unknown field", async () => {
  const original = await loadFixture();
  original.players[0].deck.push({
    floor_added_to_deck: 2,
    id: "CARD.LEGACY_UNKNOWN",
    legacy_payload: "keep-legacy-card",
  });
  let draft = setInventoryCount(original, 0, "deck", "CARD.DEFEND_SILENT", 1);
  draft = setInventoryCount(draft, 0, "relics", "RELIC.ANCHOR", 1);
  draft = updatePlayerNumber(draft, 0, "gold", 456);
  draft = updateAscension(draft, 8);
  draft = setPotionAtSlot(draft, 0, 0, "POTION.STRENGTH_POTION");
  draft = setMapNodeType(draft, 0, 1, "treasure");
  draft = setCardEnchantment(draft, 0, "CARD.STRIKE_SILENT", 1, null, {
    amount: 1,
    id: "ENCHANTMENT.ROYALLY_APPROVED",
  });

  const reparsed = parseSts2Save(serializeSts2Save(draft));

  assert.equal(reparsed.players[0].gold, 456);
  assert.equal(reparsed.ascension, 8);
  assert.deepEqual(reparsed.players[0].potions[0], {
    future_potion_field: "preserve-potion",
    id: "POTION.STRENGTH_POTION",
    slot_index: 0,
  });
  assert.equal(
    reparsed.players[0].deck.find((entry) => entry.id === "CARD.STRIKE_SILENT")
      .current_upgrade_level,
    1,
  );
  assert.deepEqual(
    reparsed.players[0].deck.find((entry) => entry.id === "CARD.STRIKE_SILENT")
      .enchantment,
    {
      amount: 1,
      id: "ENCHANTMENT.ROYALLY_APPROVED",
    },
  );
  assert.equal(reparsed.acts[0].saved_map.points[0].type, "treasure");
  assert.deepEqual(reparsed.future_root_field, { keep: "untouched" });
  assert.deepEqual(reparsed.players[0].future_player_field, { keep: true });
  assert.deepEqual(
    reparsed.players[0].deck.find(
      (entry) => entry.id === "CARD.LEGACY_UNKNOWN",
    ),
    {
      floor_added_to_deck: 2,
      id: "CARD.LEGACY_UNKNOWN",
      legacy_payload: "keep-legacy-card",
    },
  );
  assert.deepEqual(reparsed.acts[0].rooms.event_ids, ["EVENT.TEST"]);
  assert.deepEqual(reparsed.acts[0].saved_map.future_map_field, [1, 2, 3]);
  assert.equal(original.players[0].gold, 99);
  assert.equal(original.acts[0].saved_map.points[0].type, "monster");
  assert.equal(
    getModifiedSaveName("current_run.save"),
    "current_run.modified.save",
  );
});
