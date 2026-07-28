import type {
  InventoryCount,
  InventoryKind,
  MapNodeType,
  Sts2CardEnchantment,
  Sts2InventoryEntry,
  Sts2MapNode,
  Sts2Player,
  Sts2Potion,
  Sts2Save,
  SupportedNumberField,
  ValidationIssue,
} from "./types";

export const SUPPORTED_SCHEMA_VERSION = 14;

export const CARD_ID_PATTERN = /^CARD\.[A-Z0-9_]+$/;
export const ENCHANTMENT_ID_PATTERN = /^ENCHANTMENT\.[A-Z0-9_]+$/;
export const POTION_ID_PATTERN = /^POTION\.[A-Z0-9_]+$/;
export const RELIC_ID_PATTERN = /^RELIC\.[A-Z0-9_]+$/;
const STORED_CARD_ID_PATTERN = /^CARD\.[A-Z0-9_]+(?:-[A-Z0-9_]+)*$/;

export const EDITABLE_MAP_NODE_TYPES: readonly MapNodeType[] = [
  "monster",
  "elite",
  "unknown",
  "rest_site",
  "shop",
  "treasure",
];

const NUMBER_FIELDS: readonly SupportedNumberField[] = [
  "gold",
  "current_hp",
  "max_hp",
  "max_energy",
  "max_potion_slot_count",
  "base_orb_slot_count",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function addIssue(issues: ValidationIssue[], issue: ValidationIssue) {
  issues.push(issue);
}

function validateInventory(
  value: unknown,
  path: string,
  pattern: RegExp,
  kind: InventoryKind,
  issues: ValidationIssue[],
) {
  if (!Array.isArray(value)) {
    addIssue(issues, {
      code: "inventory.missing",
      message: "必须是数组。",
      path,
      severity: "error",
    });
    return;
  }

  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;

    if (!isRecord(entry)) {
      addIssue(issues, {
        code: "inventory.entry.invalid",
        message: "条目必须是对象。",
        path: entryPath,
        severity: "error",
      });
      return;
    }

    if (typeof entry.id !== "string" || !pattern.test(entry.id)) {
      addIssue(issues, {
        code: "inventory.id.invalid",
        message: "内部 ID 格式不正确。",
        path: `${entryPath}.id`,
        severity: "error",
      });
    }

    if (
      !Number.isSafeInteger(entry.floor_added_to_deck) ||
      Number(entry.floor_added_to_deck) < 1
    ) {
      addIssue(issues, {
        code: "inventory.floor.invalid",
        message: "加入层数必须是大于等于 1 的整数。",
        path: `${entryPath}.floor_added_to_deck`,
        severity: "error",
      });
    }

    if (
      kind === "deck" &&
      entry.current_upgrade_level !== undefined &&
      (!Number.isSafeInteger(entry.current_upgrade_level) ||
        Number(entry.current_upgrade_level) < 0)
    ) {
      addIssue(issues, {
        code: "card.upgrade.invalid",
        message: "卡牌升级等级必须是非负安全整数。",
        path: `${entryPath}.current_upgrade_level`,
        severity: "error",
      });
    }

    if (kind === "deck" && entry.enchantment !== undefined) {
      if (!isRecord(entry.enchantment)) {
        addIssue(issues, {
          code: "card.enchantment.invalid",
          message: "卡牌附魔必须是对象。",
          path: `${entryPath}.enchantment`,
          severity: "error",
        });
      } else {
        if (
          typeof entry.enchantment.id !== "string" ||
          !ENCHANTMENT_ID_PATTERN.test(entry.enchantment.id)
        ) {
          addIssue(issues, {
            code: "card.enchantment.id.invalid",
            message: "附魔 ID 必须使用 ENCHANTMENT. 命名空间。",
            path: `${entryPath}.enchantment.id`,
            severity: "error",
          });
        }

        if (
          !Number.isSafeInteger(entry.enchantment.amount) ||
          Number(entry.enchantment.amount) < 1
        ) {
          addIssue(issues, {
            code: "card.enchantment.amount.invalid",
            message: "附魔强度必须是大于等于 1 的安全整数。",
            path: `${entryPath}.enchantment.amount`,
            severity: "error",
          });
        }
      }
    }
  });
}

function validatePlayer(
  value: unknown,
  index: number,
  issues: ValidationIssue[],
) {
  const path = `players[${index}]`;

  if (!isRecord(value)) {
    addIssue(issues, {
      code: "player.invalid",
      message: "玩家数据必须是对象。",
      path,
      severity: "error",
    });
    return;
  }

  for (const field of NUMBER_FIELDS) {
    if (!isSafeNonNegativeInteger(value[field])) {
      addIssue(issues, {
        code: "player.number.invalid",
        message: "必须是非负安全整数。",
        path: `${path}.${field}`,
        severity: "error",
      });
    }
  }

  if (value.max_hp === 0) {
    addIssue(issues, {
      code: "player.max_hp.zero",
      message: "生命上限必须至少为 1。",
      path: `${path}.max_hp`,
      severity: "error",
    });
  }

  if (
    typeof value.current_hp === "number" &&
    typeof value.max_hp === "number" &&
    value.current_hp > value.max_hp
  ) {
    addIssue(issues, {
      code: "player.hp.exceeds_max",
      message: "当前生命不能高于生命上限。",
      path: `${path}.current_hp`,
      severity: "error",
    });
  }

  if (typeof value.character_id !== "string" || value.character_id === "") {
    addIssue(issues, {
      code: "player.character.invalid",
      message: "缺少角色 ID。",
      path: `${path}.character_id`,
      severity: "error",
    });
  }

  validateInventory(
    value.deck,
    `${path}.deck`,
    STORED_CARD_ID_PATTERN,
    "deck",
    issues,
  );
  validateInventory(
    value.relics,
    `${path}.relics`,
    RELIC_ID_PATTERN,
    "relics",
    issues,
  );

  if (value.potions !== undefined) {
    if (!Array.isArray(value.potions)) {
      addIssue(issues, {
        code: "potions.invalid",
        message: "药水数据必须是数组。",
        path: `${path}.potions`,
        severity: "error",
      });
    } else {
      const occupiedSlots = new Set<number>();

      value.potions.forEach((potion, potionIndex) => {
        const potionPath = `${path}.potions[${potionIndex}]`;

        if (!isRecord(potion)) {
          addIssue(issues, {
            code: "potion.entry.invalid",
            message: "药水条目必须是对象。",
            path: potionPath,
            severity: "error",
          });
          return;
        }

        if (
          typeof potion.id !== "string" ||
          !POTION_ID_PATTERN.test(potion.id)
        ) {
          addIssue(issues, {
            code: "potion.id.invalid",
            message: "药水 ID 必须使用 POTION. 命名空间。",
            path: `${potionPath}.id`,
            severity: "error",
          });
        }

        if (!isSafeNonNegativeInteger(potion.slot_index)) {
          addIssue(issues, {
            code: "potion.slot.invalid",
            message: "药水槽位必须是非负安全整数。",
            path: `${potionPath}.slot_index`,
            severity: "error",
          });
          return;
        }

        const slotIndex = Number(potion.slot_index);
        if (
          typeof value.max_potion_slot_count === "number" &&
          slotIndex >= value.max_potion_slot_count
        ) {
          addIssue(issues, {
            code: "potion.slot.out_of_range",
            message: "药水所在槽位超出当前药水槽数量。",
            path: `${potionPath}.slot_index`,
            severity: "error",
          });
        }

        if (occupiedSlots.has(slotIndex)) {
          addIssue(issues, {
            code: "potion.slot.duplicate",
            message: "同一药水槽不能保存多瓶药水。",
            path: `${potionPath}.slot_index`,
            severity: "error",
          });
        }
        occupiedSlots.add(slotIndex);
      });
    }
  }
}

function validateCoord(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
) {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.col) ||
    !Number.isSafeInteger(value.row)
  ) {
    addIssue(issues, {
      code: "map.coord.invalid",
      message: "节点坐标必须包含整数 col 和 row。",
      path,
      severity: "error",
    });
  }
}

function validateMapNode(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
) {
  if (!isRecord(value)) {
    addIssue(issues, {
      code: "map.node.invalid",
      message: "地图节点必须是对象。",
      path,
      severity: "error",
    });
    return;
  }

  validateCoord(value.coord, `${path}.coord`, issues);

  if (typeof value.type !== "string" || value.type === "") {
    addIssue(issues, {
      code: "map.node.type.invalid",
      message: "地图节点缺少类型。",
      path: `${path}.type`,
      severity: "error",
    });
  }

  if (value.children !== undefined && !Array.isArray(value.children)) {
    addIssue(issues, {
      code: "map.children.invalid",
      message: "节点连线必须是数组。",
      path: `${path}.children`,
      severity: "error",
    });
  } else if (Array.isArray(value.children)) {
    value.children.forEach((coord, index) => {
      validateCoord(coord, `${path}.children[${index}]`, issues);
    });
  }
}

function validateCurrentMap(
  save: Record<string, unknown>,
  issues: ValidationIssue[],
) {
  if (!Array.isArray(save.acts) || save.acts.length === 0) {
    addIssue(issues, {
      code: "acts.missing",
      message: "存档中没有章节数据。",
      path: "acts",
      severity: "error",
    });
    return;
  }

  if (
    !Number.isSafeInteger(save.current_act_index) ||
    Number(save.current_act_index) < 0 ||
    Number(save.current_act_index) >= save.acts.length
  ) {
    addIssue(issues, {
      code: "acts.current.invalid",
      message: "当前章节索引无效。",
      path: "current_act_index",
      severity: "error",
    });
    return;
  }

  const actIndex = Number(save.current_act_index);
  const act = save.acts[actIndex];
  const map = isRecord(act) ? act.saved_map : null;

  if (!isRecord(map)) {
    addIssue(issues, {
      code: "map.missing",
      message: "当前章节缺少 saved_map。",
      path: `acts[${actIndex}].saved_map`,
      severity: "error",
    });
    return;
  }

  if (
    !Number.isSafeInteger(map.width) ||
    Number(map.width) < 1 ||
    !Number.isSafeInteger(map.height) ||
    Number(map.height) < 1
  ) {
    addIssue(issues, {
      code: "map.size.invalid",
      message: "地图宽高必须是正整数。",
      path: `acts[${actIndex}].saved_map`,
      severity: "error",
    });
  }

  if (!Array.isArray(map.points)) {
    addIssue(issues, {
      code: "map.points.invalid",
      message: "地图普通节点必须是数组。",
      path: `acts[${actIndex}].saved_map.points`,
      severity: "error",
    });
  } else {
    map.points.forEach((point, index) => {
      validateMapNode(
        point,
        `acts[${actIndex}].saved_map.points[${index}]`,
        issues,
      );
    });
  }

  if (!Array.isArray(map.start_coords)) {
    addIssue(issues, {
      code: "map.start_coords.invalid",
      message: "地图起点坐标必须是数组。",
      path: `acts[${actIndex}].saved_map.start_coords`,
      severity: "error",
    });
  } else {
    map.start_coords.forEach((coord, index) => {
      validateCoord(
        coord,
        `acts[${actIndex}].saved_map.start_coords[${index}]`,
        issues,
      );
    });
  }

  validateMapNode(map.start, `acts[${actIndex}].saved_map.start`, issues);
  validateMapNode(map.boss, `acts[${actIndex}].saved_map.boss`, issues);
}

export function parseSts2Save(source: string): Sts2Save {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("文件不是有效的 UTF-8 JSON 存档。");
  }

  if (!isRecord(parsed)) {
    throw new Error("存档根节点必须是 JSON 对象。");
  }

  return parsed as Sts2Save;
}

export function validateSts2Save(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return [
      {
        code: "save.invalid",
        message: "存档根节点必须是对象。",
        path: "$",
        severity: "error",
      },
    ];
  }

  if (value.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    addIssue(issues, {
      code: "schema.unsupported",
      message: `首版仅支持 schema_version ${SUPPORTED_SCHEMA_VERSION}。`,
      path: "schema_version",
      severity: "error",
    });
  }

  if (
    value.ascension !== undefined &&
    !isSafeNonNegativeInteger(value.ascension)
  ) {
    addIssue(issues, {
      code: "save.ascension.invalid",
      message: "进阶等级必须是非负安全整数。",
      path: "ascension",
      severity: "error",
    });
  }

  if (!Array.isArray(value.players) || value.players.length === 0) {
    addIssue(issues, {
      code: "players.missing",
      message: "存档中没有玩家数据。",
      path: "players",
      severity: "error",
    });
  } else {
    value.players.forEach((player, index) => {
      validatePlayer(player, index, issues);
    });
  }

  validateCurrentMap(value, issues);
  return issues;
}

export function hasValidationErrors(issues: readonly ValidationIssue[]) {
  return issues.some((issue) => issue.severity === "error");
}

export function hasStructuralValidationErrors(
  issues: readonly ValidationIssue[],
) {
  return issues.some(
    (issue) =>
      issue.severity === "error" &&
      ![
        "schema.unsupported",
        "player.number.invalid",
        "player.max_hp.zero",
        "player.hp.exceeds_max",
        "save.ascension.invalid",
      ].includes(issue.code),
  );
}

export function cloneSts2Save(save: Sts2Save): Sts2Save {
  return structuredClone(save);
}

export function normalizeInventoryId(value: string, kind: InventoryKind) {
  const normalized = value.trim().toUpperCase();
  const pattern = kind === "deck" ? CARD_ID_PATTERN : RELIC_ID_PATTERN;

  if (!pattern.test(normalized)) {
    throw new Error(
      kind === "deck"
        ? "卡牌 ID 必须符合 CARD.[A-Z0-9_]+。"
        : "遗物 ID 必须符合 RELIC.[A-Z0-9_]+。",
    );
  }

  return normalized;
}

export function countInventory(
  entries: readonly Sts2InventoryEntry[],
  kind: InventoryKind,
): InventoryCount[] {
  const counts = new Map<string, InventoryCount>();

  for (const entry of entries) {
    const upgradeLevel = kind === "deck" ? getCardUpgradeLevel(entry) : 0;
    const enchantment = kind === "deck" ? getCardEnchantment(entry) : null;
    const key = `${entry.id}\u0000${upgradeLevel}\u0000${
      enchantment?.id ?? ""
    }\u0000${enchantment?.amount ?? 0}`;
    const existing = counts.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        count: 1,
        enchantment,
        firstEntry: entry,
        id: entry.id,
        upgradeLevel,
      });
    }
  }

  return Array.from(counts.values());
}

export function getCardUpgradeLevel(entry: Sts2InventoryEntry) {
  return Number.isSafeInteger(entry.current_upgrade_level) &&
    Number(entry.current_upgrade_level) > 0
    ? Number(entry.current_upgrade_level)
    : 0;
}

export function getCardEnchantment(
  entry: Sts2InventoryEntry,
): Sts2CardEnchantment | null {
  if (
    isRecord(entry.enchantment) &&
    typeof entry.enchantment.id === "string" &&
    Number.isSafeInteger(entry.enchantment.amount)
  ) {
    return entry.enchantment as Sts2CardEnchantment;
  }

  return null;
}

function enchantmentMatches(
  entry: Sts2InventoryEntry,
  enchantment: Sts2CardEnchantment | null,
) {
  const current = getCardEnchantment(entry);

  return enchantment === null
    ? current === null
    : current?.id === enchantment.id && current.amount === enchantment.amount;
}

export function inferCurrentFloor(save: Sts2Save) {
  if (Array.isArray(save.map_point_history)) {
    return Math.max(1, save.map_point_history.length);
  }

  return 1;
}

function getPlayer(save: Sts2Save, playerIndex: number): Sts2Player {
  const player = save.players[playerIndex];

  if (!player) {
    throw new Error("找不到所选玩家。");
  }

  return player;
}

export function setInventoryCount(
  save: Sts2Save,
  playerIndex: number,
  kind: InventoryKind,
  rawId: string,
  nextCount: number,
  upgradeLevel?: number,
  enchantment?: Sts2CardEnchantment | null,
) {
  if (!Number.isSafeInteger(nextCount) || nextCount < 0) {
    throw new Error("数量必须是非负整数。");
  }

  const id = rawId.trim().toUpperCase();
  const storedPattern =
    kind === "deck" ? STORED_CARD_ID_PATTERN : RELIC_ID_PATTERN;

  if (!storedPattern.test(id)) {
    throw new Error(
      kind === "deck"
        ? "卡牌 ID 必须使用 CARD. 命名空间。"
        : "遗物 ID 必须符合 RELIC.[A-Z0-9_]+。",
    );
  }

  if (
    upgradeLevel !== undefined &&
    (!Number.isSafeInteger(upgradeLevel) || upgradeLevel < 0)
  ) {
    throw new Error("卡牌升级等级必须是非负安全整数。");
  }

  if (
    enchantment !== undefined &&
    enchantment !== null &&
    (!ENCHANTMENT_ID_PATTERN.test(enchantment.id) ||
      !Number.isSafeInteger(enchantment.amount) ||
      enchantment.amount < 1)
  ) {
    throw new Error("卡牌附魔必须包含有效 ID 和正整数强度。");
  }

  const next = cloneSts2Save(save);
  const player = getPlayer(next, playerIndex);
  const entries = player[kind];
  const matchesVariant = (entry: Sts2InventoryEntry) =>
    entry.id === id &&
    (kind !== "deck" ||
      upgradeLevel === undefined ||
      getCardUpgradeLevel(entry) === upgradeLevel) &&
    (kind !== "deck" ||
      enchantment === undefined ||
      enchantmentMatches(entry, enchantment));
  const matching = entries.filter(matchesVariant);

  if (nextCount < matching.length) {
    let remainingToKeep = nextCount;
    player[kind] = entries.filter((entry) => {
      if (!matchesVariant(entry)) {
        return true;
      }

      if (remainingToKeep > 0) {
        remainingToKeep -= 1;
        return true;
      }

      return false;
    });
  } else if (nextCount > matching.length) {
    const template = matching[0];
    const floor = inferCurrentFloor(next);
    const additions = Array.from({ length: nextCount - matching.length }, () =>
      template
        ? structuredClone(template)
        : {
            floor_added_to_deck: floor,
            id,
            ...(kind === "deck" &&
            upgradeLevel !== undefined &&
            upgradeLevel > 0
              ? { current_upgrade_level: upgradeLevel }
              : {}),
            ...(kind === "deck" && enchantment
              ? { enchantment: structuredClone(enchantment) }
              : {}),
          },
    );
    player[kind] = [...entries, ...additions];
  }

  return next;
}

export function setCardUpgradeLevel(
  save: Sts2Save,
  playerIndex: number,
  rawId: string,
  currentLevel: number,
  nextLevel: 0 | 1,
  enchantment?: Sts2CardEnchantment | null,
) {
  if (
    !Number.isSafeInteger(currentLevel) ||
    currentLevel < 0 ||
    ![0, 1].includes(nextLevel)
  ) {
    throw new Error("目前只支持普通版与 +1 升级版之间切换。");
  }

  const id = rawId.trim().toUpperCase();

  if (!STORED_CARD_ID_PATTERN.test(id)) {
    throw new Error("卡牌 ID 必须使用 CARD. 命名空间。");
  }

  const next = cloneSts2Save(save);
  const player = getPlayer(next, playerIndex);
  const matching = player.deck.filter(
    (entry) =>
      entry.id === id &&
      getCardUpgradeLevel(entry) === currentLevel &&
      (enchantment === undefined || enchantmentMatches(entry, enchantment)),
  );

  if (matching.length === 0) {
    throw new Error("找不到要修改的卡牌版本。");
  }

  for (const entry of matching) {
    if (nextLevel === 0) {
      delete entry.current_upgrade_level;
    } else {
      entry.current_upgrade_level = 1;
    }
  }

  return next;
}

export function setCardEnchantment(
  save: Sts2Save,
  playerIndex: number,
  rawId: string,
  upgradeLevel: number,
  currentEnchantment: Sts2CardEnchantment | null,
  nextEnchantment: Sts2CardEnchantment | null,
) {
  const id = rawId.trim().toUpperCase();

  if (!STORED_CARD_ID_PATTERN.test(id)) {
    throw new Error("卡牌 ID 必须使用 CARD. 命名空间。");
  }

  if (!Number.isSafeInteger(upgradeLevel) || upgradeLevel < 0) {
    throw new Error("卡牌升级等级必须是非负安全整数。");
  }

  if (
    nextEnchantment !== null &&
    (!ENCHANTMENT_ID_PATTERN.test(nextEnchantment.id) ||
      !Number.isSafeInteger(nextEnchantment.amount) ||
      nextEnchantment.amount < 1)
  ) {
    throw new Error("卡牌附魔必须包含有效 ID 和正整数强度。");
  }

  const next = cloneSts2Save(save);
  const player = getPlayer(next, playerIndex);
  const target = player.deck.find(
    (entry) =>
      entry.id === id &&
      getCardUpgradeLevel(entry) === upgradeLevel &&
      enchantmentMatches(entry, currentEnchantment),
  );

  if (!target) {
    throw new Error("找不到要修改附魔的卡牌版本。");
  }

  if (nextEnchantment === null) {
    delete target.enchantment;
  } else if (target.enchantment?.id === nextEnchantment.id) {
    target.enchantment = {
      ...target.enchantment,
      amount: nextEnchantment.amount,
      id: nextEnchantment.id,
    };
  } else {
    target.enchantment = structuredClone(nextEnchantment);
  }

  return next;
}

export function updatePlayerNumber(
  save: Sts2Save,
  playerIndex: number,
  field: SupportedNumberField,
  value: number,
) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("数值必须是非负安全整数。");
  }

  if (field === "max_hp" && value < 1) {
    throw new Error("生命上限必须至少为 1。");
  }

  const next = cloneSts2Save(save);
  const player = getPlayer(next, playerIndex);
  player[field] = value;
  return next;
}

export function updateAscension(save: Sts2Save, value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("进阶等级必须是非负安全整数。");
  }

  const next = cloneSts2Save(save);
  next.ascension = value;
  return next;
}

export function setPotionAtSlot(
  save: Sts2Save,
  playerIndex: number,
  slotIndex: number,
  rawId: string | null,
) {
  if (!Number.isSafeInteger(slotIndex) || slotIndex < 0) {
    throw new Error("药水槽位必须是非负安全整数。");
  }

  const next = cloneSts2Save(save);
  const player = getPlayer(next, playerIndex);

  if (slotIndex >= player.max_potion_slot_count) {
    throw new Error("药水槽位超出当前药水槽数量。");
  }

  const potions = Array.isArray(player.potions) ? player.potions : [];
  const existingIndex = potions.findIndex(
    (potion) => potion.slot_index === slotIndex,
  );

  if (rawId === null || rawId.trim() === "") {
    player.potions = potions.filter(
      (potion) => potion.slot_index !== slotIndex,
    );
    return next;
  }

  const id = rawId.trim().toUpperCase();
  if (!POTION_ID_PATTERN.test(id)) {
    throw new Error("药水 ID 必须使用 POTION. 命名空间。");
  }

  if (existingIndex >= 0) {
    potions[existingIndex] = {
      ...potions[existingIndex],
      id,
      slot_index: slotIndex,
    };
  } else {
    potions.push({
      id,
      slot_index: slotIndex,
    } satisfies Sts2Potion);
  }

  player.potions = potions.sort(
    (left, right) => left.slot_index - right.slot_index,
  );
  return next;
}

export function getCurrentMap(save: Sts2Save) {
  const actIndex = save.current_act_index;

  if (
    !Number.isSafeInteger(actIndex) ||
    actIndex < 0 ||
    actIndex >= save.acts.length
  ) {
    throw new Error("地图层索引无效。");
  }

  const act = save.acts[actIndex];

  if (!act?.saved_map) {
    throw new Error("当前章节尚未生成可编辑地图。");
  }

  return act.saved_map;
}

export function setMapNodeType(
  save: Sts2Save,
  col: number,
  row: number,
  type: MapNodeType,
) {
  if (!EDITABLE_MAP_NODE_TYPES.includes(type)) {
    throw new Error("不支持该地图节点类型。");
  }

  const next = cloneSts2Save(save);
  const map = getCurrentMap(next);
  const point = map.points.find(
    (node) => node.coord.col === col && node.coord.row === row,
  );

  if (!point) {
    throw new Error("只能修改普通地图节点，起点与 Boss 节点保持锁定。");
  }

  point.type = type;
  return next;
}

export function serializeSts2Save(save: Sts2Save) {
  const issues = validateSts2Save(save);

  if (hasValidationErrors(issues)) {
    throw new Error("存档仍有校验错误，无法导出。");
  }

  return `${JSON.stringify(save, null, 2)}\n`;
}

export function getModifiedSaveName(fileName: string) {
  if (fileName.toLowerCase().endsWith(".save")) {
    return `${fileName.slice(0, -5)}.modified.save`;
  }

  return `${fileName}.modified.save`;
}

export function findMapNode(
  save: Sts2Save,
  col: number,
  row: number,
): Sts2MapNode | null {
  const map = getCurrentMap(save);
  return (
    map.points.find(
      (node) => node.coord.col === col && node.coord.row === row,
    ) ?? null
  );
}
