import type { EnchantmentCatalogEntry } from "./types";

const ENCHANTMENT_SOURCE_URL =
  "https://sts2.huijiwiki.com/wiki/%E9%99%84%E9%AD%94";

export const ENCHANTMENTS = [
  {
    description: "获得 X 点格挡。",
    id: "ENCHANTMENT.ADROIT",
    name: "伶俐",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌能在休息处被复制。",
    id: "ENCHANTMENT.CLONE",
    name: "克隆",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "造成的伤害增加 50%，但会失去 2 点生命。",
    id: "ENCHANTMENT.CORRUPTED",
    name: "腐化",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌每场战斗能够重放一次。",
    id: "ENCHANTMENT.GLAM",
    name: "华彩",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "获得消耗；打出时永久增加这张牌的格挡值。",
    id: "ENCHANTMENT.GOOPY",
    name: "黏糊",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌在每场战斗开始时自动打出。",
    id: "ENCHANTMENT.IMBUED",
    name: "注能",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "额外造成 1 点伤害，并造成 1 层虚弱。",
    id: "ENCHANTMENT.INKY",
    name: "墨影",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌的攻击伤害翻倍。",
    id: "ENCHANTMENT.INSTINCT",
    name: "本能",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "本场战斗中每次打出，攻击伤害增加 X 点。",
    id: "ENCHANTMENT.MOMENTUM",
    name: "动量",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌获得的格挡值增加 X 点。",
    id: "ENCHANTMENT.NIMBLE",
    name: "灵巧",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "洗入抽牌堆时，将其放在抽牌堆顶。",
    id: "ENCHANTMENT.PERFECT_FIT",
    name: "完美契合",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌拥有固有和保留。",
    id: "ENCHANTMENT.ROYALLY_APPROVED",
    name: "王室认证",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌上的伤害值增加 X 点。",
    id: "ENCHANTMENT.SHARP",
    name: "锋利",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "抽到时，费用在 0 到 3 之间随机变化。",
    id: "ENCHANTMENT.SLITHER",
    name: "蛇行",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "回合结束时若在手牌中，费用降低 1 点直到打出。",
    id: "ENCHANTMENT.SLUMBERING_ESSENCE",
    name: "沉眠精华",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌失去消耗。",
    id: "ENCHANTMENT.SOULS_POWER",
    name: "灵魂之力",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "每场战斗第一次打出时获得 X 点能量。",
    id: "ENCHANTMENT.SOWN",
    name: "播种",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌获得重放 1。",
    id: "ENCHANTMENT.SPIRAL",
    name: "涡旋",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "这张牌获得保留。",
    id: "ENCHANTMENT.STEADY",
    name: "稳定",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "第一次打出这张牌时，抽 X 张牌。",
    id: "ENCHANTMENT.SWIFT",
    name: "迅速",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "费用为 0，额外造成 3 点伤害，并获得永恒。",
    id: "ENCHANTMENT.TEZCATARAS_EMBER",
    name: "特兹卡塔拉的余烬",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
  {
    description: "第一次打出这张牌时，额外造成 X 点伤害。",
    id: "ENCHANTMENT.VIGOROUS",
    name: "活力",
    sourceUrl: ENCHANTMENT_SOURCE_URL,
  },
] as const satisfies readonly EnchantmentCatalogEntry[];

export const ENCHANTMENT_BY_ID = new Map<string, EnchantmentCatalogEntry>(
  ENCHANTMENTS.map((entry) => [entry.id, entry]),
);
