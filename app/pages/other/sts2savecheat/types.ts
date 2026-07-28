export type CatalogKind = "card" | "relic";

export type InventoryKind = "deck" | "relics";

export type EditorSection = "cards" | "relics" | "misc" | "map";

export type MapNodeType =
  "monster" | "elite" | "unknown" | "rest_site" | "shop" | "treasure";

export type SupportedNumberField =
  | "gold"
  | "current_hp"
  | "max_hp"
  | "max_energy"
  | "max_potion_slot_count"
  | "base_orb_slot_count";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
  severity: ValidationSeverity;
}

export interface CatalogEntry {
  kind: CatalogKind;
  id: string;
  name: string;
  pool: string;
  rarity: string;
  type?: string;
  cost?: string;
  description: string;
  imagePath: string;
  sourceUrl: string;
  multiplayerOnly?: boolean;
}

export interface CatalogFile {
  source: string;
  sourceUrl: string;
  sourceVersion: string;
  generatedAt: string;
  entries: CatalogEntry[];
}

export interface PotionCatalogEntry {
  description: string;
  id: string;
  name: string;
  pool: string;
  rarity: string;
  sourceUrl: string;
}

export interface PotionCatalogFile {
  dataSourceUrl: string;
  entries: PotionCatalogEntry[];
  generatedAt: string;
  source: string;
  sourceUrl: string;
  sourceVersion: string;
}

export interface EnchantmentCatalogEntry {
  description: string;
  id: string;
  name: string;
  sourceUrl: string;
}

export interface Sts2CardEnchantment {
  amount: number;
  id: string;
  [key: string]: unknown;
}

export interface Sts2InventoryEntry {
  current_upgrade_level?: number;
  enchantment?: Sts2CardEnchantment;
  floor_added_to_deck: number;
  id: string;
  [key: string]: unknown;
}

export interface Sts2Potion {
  id: string;
  slot_index: number;
  [key: string]: unknown;
}

export interface Sts2Player {
  base_orb_slot_count: number;
  character_id: string;
  current_hp: number;
  deck: Sts2InventoryEntry[];
  gold: number;
  max_energy: number;
  max_hp: number;
  max_potion_slot_count: number;
  net_id?: number;
  potions?: Sts2Potion[];
  relics: Sts2InventoryEntry[];
  [key: string]: unknown;
}

export interface Sts2MapCoord {
  col: number;
  row: number;
}

export interface Sts2MapNode {
  can_modify?: boolean;
  children?: Sts2MapCoord[];
  coord: Sts2MapCoord;
  type: string;
  [key: string]: unknown;
}

export interface Sts2SavedMap {
  boss: Sts2MapNode;
  height: number;
  points: Sts2MapNode[];
  start: Sts2MapNode;
  start_coords: Sts2MapCoord[];
  width: number;
  [key: string]: unknown;
}

export interface Sts2Act {
  id: string;
  rooms: Record<string, unknown>;
  saved_map: Sts2SavedMap | null;
  [key: string]: unknown;
}

export interface Sts2Save {
  ascension?: number;
  acts: Sts2Act[];
  current_act_index: number;
  map_point_history?: unknown;
  players: Sts2Player[];
  schema_version: number;
  visited_map_coords?: Sts2MapCoord[];
  [key: string]: unknown;
}

export interface InventoryCount {
  count: number;
  enchantment: Sts2CardEnchantment | null;
  firstEntry: Sts2InventoryEntry;
  id: string;
  upgradeLevel: number;
}
