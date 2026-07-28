import { loadCardCatalog } from "./catalog-config";
import { InventoryEditor } from "./inventory-editor";
import type {
  Sts2CardEnchantment,
  Sts2Save,
} from "./types";

export default function CardEditor({
  onCountChange,
  onEnchantmentChange,
  onUpgradeChange,
  playerIndex,
  save,
}: {
  onCountChange: (
    id: string,
    nextCount: number,
    upgradeLevel?: number,
    enchantment?: Sts2CardEnchantment | null,
  ) => void;
  onEnchantmentChange: (
    id: string,
    upgradeLevel: number,
    currentEnchantment: Sts2CardEnchantment | null,
    nextEnchantment: Sts2CardEnchantment | null,
  ) => void;
  onUpgradeChange: (
    id: string,
    currentLevel: number,
    nextLevel: 0 | 1,
    enchantment?: Sts2CardEnchantment | null,
  ) => void;
  playerIndex: number;
  save: Sts2Save;
}) {
  return (
    <InventoryEditor
      catalogLoader={loadCardCatalog}
      kind="deck"
      onCountChange={onCountChange}
      onEnchantmentChange={onEnchantmentChange}
      onUpgradeChange={onUpgradeChange}
      playerIndex={playerIndex}
      save={save}
      title="卡牌修改"
    />
  );
}
