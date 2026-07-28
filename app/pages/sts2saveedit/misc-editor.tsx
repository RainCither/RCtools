import { useEffect, useState } from "react";
import potionCatalogJson from "./catalog/potions.json";
import styles from "./styles.module.css";
import type {
  PotionCatalogEntry,
  PotionCatalogFile,
  Sts2Save,
  SupportedNumberField,
} from "./types";

const potionCatalog = potionCatalogJson as PotionCatalogFile;
const potionById = new Map(
  potionCatalog.entries.map((entry) => [entry.id, entry]),
);
const potionGroups = Object.entries(
  potionCatalog.entries.reduce<Record<string, PotionCatalogEntry[]>>(
    (groups, entry) => {
      (groups[entry.pool] ??= []).push(entry);
      return groups;
    },
    {},
  ),
);
const MAX_RENDERED_POTION_SLOTS = 20;

const FIELD_DEFINITIONS: readonly {
  field: SupportedNumberField;
  label: string;
  hint: string;
  minimum: number;
}[] = [
  {
    field: "gold",
    hint: "玩家当前持有的金币",
    label: "金币",
    minimum: 0,
  },
  {
    field: "current_hp",
    hint: "不可高于生命上限",
    label: "当前生命",
    minimum: 0,
  },
  {
    field: "max_hp",
    hint: "必须至少为 1",
    label: "生命上限",
    minimum: 1,
  },
  {
    field: "max_energy",
    hint: "每回合的最大能量",
    label: "最大能量",
    minimum: 0,
  },
  {
    field: "max_potion_slot_count",
    hint: "药水栏可容纳数量",
    label: "药水槽",
    minimum: 0,
  },
  {
    field: "base_orb_slot_count",
    hint: "角色基础充能球槽",
    label: "基础充能球槽",
    minimum: 0,
  },
];

function createDraftValues(
  player: Sts2Save["players"][number],
): Record<SupportedNumberField, string> {
  return {
    base_orb_slot_count: String(player.base_orb_slot_count),
    current_hp: String(player.current_hp),
    gold: String(player.gold),
    max_energy: String(player.max_energy),
    max_hp: String(player.max_hp),
    max_potion_slot_count: String(player.max_potion_slot_count),
  };
}

export default function MiscEditor({
  onAscensionChange,
  onNumberChange,
  onPotionChange,
  playerIndex,
  save,
}: {
  onAscensionChange: (value: number) => void;
  onNumberChange: (field: SupportedNumberField, value: number) => void;
  onPotionChange: (slotIndex: number, id: string | null) => void;
  playerIndex: number;
  save: Sts2Save;
}) {
  const player = save.players[playerIndex];
  const [draftValues, setDraftValues] = useState(() =>
    createDraftValues(player),
  );
  const [ascensionDraft, setAscensionDraft] = useState(
    String(save.ascension ?? 0),
  );
  const potions = Array.isArray(player.potions) ? player.potions : [];
  const visibleSlotCount = Math.min(
    player.max_potion_slot_count,
    MAX_RENDERED_POTION_SLOTS,
  );

  useEffect(() => {
    setDraftValues(createDraftValues(player));
  }, [
    player.base_orb_slot_count,
    player.current_hp,
    player.gold,
    player.max_energy,
    player.max_hp,
    player.max_potion_slot_count,
    playerIndex,
  ]);

  useEffect(() => {
    setAscensionDraft(String(save.ascension ?? 0));
  }, [save.ascension]);

  return (
    <section aria-labelledby="misc-editor-title" className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>RUN PARAMETERS</span>
          <h1 id="misc-editor-title">杂项修改</h1>
          <p>
            编辑玩家数值、进阶等级和药水槽。格式或生命关系不合法时，
            导出会自动锁定。
          </p>
        </div>
        <span className={styles.sectionBadge}>{player.character_id}</span>
      </header>

      <div className={styles.miscGrid}>
        <label className={styles.statField}>
          <span>进阶等级</span>
          <input
            min="0"
            onBlur={() => {
              if (ascensionDraft.trim() === "") {
                setAscensionDraft("1");
                onAscensionChange(1);
              }
            }}
            onChange={(event) => {
              const rawValue = event.currentTarget.value;
              setAscensionDraft(rawValue);

              if (rawValue.trim() === "") {
                return;
              }

              const value = Number(rawValue);
              if (Number.isSafeInteger(value) && value >= 0) {
                onAscensionChange(value);
              }
            }}
            step="1"
            type="number"
            value={ascensionDraft}
          />
          <small>根存档的 ascension 字段</small>
        </label>

        {FIELD_DEFINITIONS.map((definition) => {
          const invalidHp =
            definition.field === "current_hp" &&
            player.current_hp > player.max_hp;

          return (
            <label
              className={`${styles.statField} ${
                invalidHp ? styles.statFieldInvalid : ""
              }`}
              key={definition.field}
            >
              <span>{definition.label}</span>
              <input
                aria-invalid={invalidHp}
                max={
                  definition.field === "current_hp" ? player.max_hp : undefined
                }
                min={definition.minimum}
                onBlur={() => {
                  if (draftValues[definition.field].trim() === "") {
                    setDraftValues((current) => ({
                      ...current,
                      [definition.field]: "1",
                    }));
                    onNumberChange(definition.field, 1);
                  }
                }}
                onChange={(event) => {
                  const rawValue = event.currentTarget.value;
                  setDraftValues((current) => ({
                    ...current,
                    [definition.field]: rawValue,
                  }));

                  if (rawValue.trim() === "") {
                    return;
                  }

                  const value = Number(rawValue);
                  if (
                    Number.isSafeInteger(value) &&
                    value >= definition.minimum
                  ) {
                    onNumberChange(definition.field, value);
                  }
                }}
                step="1"
                type="number"
                value={draftValues[definition.field]}
              />
              <small>{definition.hint}</small>
            </label>
          );
        })}
      </div>

      <section
        aria-labelledby="potion-editor-title"
        className={styles.potionWorkbench}
      >
        <header className={styles.potionHeader}>
          <div>
            <span className={styles.eyebrow}>POTION SLOTS</span>
            <h2 id="potion-editor-title">药水修改</h2>
            <p>选择药水会写入对应 slot_index；清空只删除该槽条目。</p>
          </div>
          <span>
            {potions.length} / {player.max_potion_slot_count}
          </span>
        </header>

        {visibleSlotCount > 0 ? (
          <div className={styles.potionGrid}>
            {Array.from({ length: visibleSlotCount }, (_, slotIndex) => {
              const potion = potions.find(
                (entry) => entry.slot_index === slotIndex,
              );
              const catalogEntry = potion
                ? potionById.get(potion.id)
                : undefined;
              const isUnknown = Boolean(potion) && catalogEntry === undefined;

              return (
                <article className={styles.potionSlot} key={slotIndex}>
                  <div className={styles.potionSlotMark}>
                    <strong>{slotIndex + 1}</strong>
                    <span>{potion ? "已占用" : "空槽位"}</span>
                  </div>
                  <label>
                    <span>药水</span>
                    <select
                      aria-label={`药水槽 ${slotIndex + 1}`}
                      onChange={(event) =>
                        onPotionChange(
                          slotIndex,
                          event.currentTarget.value || null,
                        )
                      }
                      value={potion?.id ?? ""}
                    >
                      <option value="">空槽位</option>
                      {isUnknown ? (
                        <option value={potion?.id}>
                          未收录 · {potion?.id}
                        </option>
                      ) : null}
                      {potionGroups.map(([pool, entries]) => (
                        <optgroup key={pool} label={pool}>
                          {entries.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name} · {entry.rarity}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <div className={styles.potionCopy}>
                    <strong>
                      {catalogEntry?.name ?? potion?.id ?? "暂无药水"}
                    </strong>
                    <span>
                      {catalogEntry
                        ? `${catalogEntry.pool} · ${catalogEntry.rarity}`
                        : potion
                          ? "未收录条目会保持原始 ID"
                          : "从上方目录选择一瓶药水"}
                    </span>
                    <p>{catalogEntry?.description ?? ""}</p>
                    {catalogEntry ? (
                      <a
                        href={catalogEntry.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        查看灰机 Wiki 条目
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyPotionSlots}>
            当前药水槽数量为 0。先在上方调整“药水槽”即可添加药水。
          </p>
        )}

        {player.max_potion_slot_count > MAX_RENDERED_POTION_SLOTS ? (
          <p className={styles.potionLimitNote}>
            为避免页面失去响应，界面仅展示前 {MAX_RENDERED_POTION_SLOTS}{" "}
            个槽位。
          </p>
        ) : null}

        <p className={styles.potionSource}>
          静态目录共 {potionCatalog.entries.length} 项；条目链接至
          <a href={potionCatalog.sourceUrl} rel="noreferrer" target="_blank">
            灰机 Wiki 药水分类
          </a>
          ，中文目录由
          <a
            href={potionCatalog.dataSourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Spire Codex 游戏数据接口
          </a>
          整理。
        </p>
      </section>

      <aside className={styles.safetyNote}>
        <strong>不会改动的内容</strong>
        <p>
          充能球当前状态、角色变量、随机种子、事件池、药水条目的未知字段和
          其他未知字段，均保持本次导入时的原始结构。
        </p>
      </aside>
    </section>
  );
}
