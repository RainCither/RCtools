import { loadRelicCatalog } from "./catalog-config";
import { InventoryEditor } from "./inventory-editor";
import type { Sts2Save } from "./types";

export default function RelicEditor({
  onCountChange,
  playerIndex,
  save,
}: {
  onCountChange: (
    id: string,
    nextCount: number,
    upgradeLevel?: number,
  ) => void;
  playerIndex: number;
  save: Sts2Save;
}) {
  return (
    <InventoryEditor
      catalogLoader={loadRelicCatalog}
      kind="relics"
      onCountChange={onCountChange}
      playerIndex={playerIndex}
      save={save}
      title="遗物修改"
    />
  );
}
