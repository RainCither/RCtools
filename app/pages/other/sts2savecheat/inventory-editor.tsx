import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CatalogImage } from "./catalog-image";
import {
  ENCHANTMENTS,
  ENCHANTMENT_BY_ID,
} from "./enchantments";
import { Icon } from "./icons";
import { countInventory, normalizeInventoryId } from "./save-core";
import styles from "./styles.module.css";
import type {
  CatalogEntry,
  CatalogFile,
  InventoryCount,
  InventoryKind,
  Sts2CardEnchantment,
  Sts2Save,
} from "./types";

const PAGE_SIZE = 36;
const NON_ENCHANTABLE_CARD_TYPES = new Set([
  "任务",
  "状态",
  "诅咒",
]);

type InventoryEditorProps = {
  catalogLoader: () => Promise<CatalogFile>;
  kind: InventoryKind;
  playerIndex: number;
  save: Sts2Save;
  title: string;
  onCountChange: (
    id: string,
    nextCount: number,
    upgradeLevel?: number,
    enchantment?: Sts2CardEnchantment | null,
  ) => void;
  onEnchantmentChange?: (
    id: string,
    upgradeLevel: number,
    currentEnchantment: Sts2CardEnchantment | null,
    nextEnchantment: Sts2CardEnchantment | null,
  ) => void;
  onUpgradeChange?: (
    id: string,
    currentLevel: number,
    nextLevel: 0 | 1,
    enchantment?: Sts2CardEnchantment | null,
  ) => void;
};

function inventoryVariantKey(
  id: string,
  upgradeLevel: number,
  enchantment: Sts2CardEnchantment | null = null,
) {
  return `${id}\u0000${upgradeLevel}\u0000${
    enchantment?.id ?? ""
  }\u0000${enchantment?.amount ?? 0}`;
}

function EnchantmentControl({
  cardName,
  current,
  onApply,
}: {
  cardName: string;
  current: Sts2CardEnchantment | null;
  onApply: (next: Sts2CardEnchantment | null) => void;
}) {
  const [selectedId, setSelectedId] = useState(current?.id ?? "");
  const [amountDraft, setAmountDraft] = useState(
    String(current?.amount ?? 1),
  );
  const selectedEntry = ENCHANTMENT_BY_ID.get(selectedId);
  const parsedAmount = Number(amountDraft);
  const amountIsValid =
    selectedId === "" ||
    (Number.isSafeInteger(parsedAmount) && parsedAmount >= 1);
  const hasChanged =
    selectedId !== (current?.id ?? "") ||
    (selectedId !== "" && parsedAmount !== current?.amount);
  const currentIsUnknown =
    Boolean(current) && !ENCHANTMENT_BY_ID.has(current?.id ?? "");

  return (
    <div className={styles.enchantmentControl}>
      <label className={styles.enchantmentSelect}>
        <span>附魔</span>
        <select
          aria-label={`${cardName}附魔`}
          onChange={(event) => {
            setSelectedId(event.currentTarget.value);
            if (event.currentTarget.value && amountDraft.trim() === "") {
              setAmountDraft("1");
            }
          }}
          value={selectedId}
        >
          <option value="">无附魔</option>
          {currentIsUnknown && current ? (
            <option value={current.id}>{current.id}（目录外）</option>
          ) : null}
          {ENCHANTMENTS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>

      {selectedId ? (
        <label className={styles.enchantmentAmount}>
          <span>附魔等级</span>
          <input
            aria-invalid={!amountIsValid}
            aria-label={`${cardName}附魔强度`}
            min="1"
            onChange={(event) => setAmountDraft(event.currentTarget.value)}
            step="1"
            type="number"
            value={amountDraft}
          />
        </label>
      ) : null}

      <button
        className={styles.enchantmentApply}
        disabled={!hasChanged || !amountIsValid}
        onClick={() =>
          onApply(
            selectedId
              ? {
                  amount: parsedAmount,
                  id: selectedId,
                }
              : null,
          )
        }
        type="button"
      >
        {selectedId
          ? current
            ? "更新 1 张"
            : "附魔 1 张"
          : "移除 1 张"}
      </button>

      <small className={styles.enchantmentDescription}>
        {selectedEntry?.description ??
          (selectedId
            ? "目录外附魔将按原始 ID 保留。"
            : "每次只修改这一版本中的一张卡牌。")}
      </small>
    </div>
  );
}

function CurrentInventoryItem({
  entry,
  item,
  kind,
  onCountChange,
  onEnchantmentChange,
  onUpgradeChange,
}: {
  entry?: CatalogEntry;
  item: InventoryCount;
  kind: InventoryKind;
  onCountChange: InventoryEditorProps["onCountChange"];
  onEnchantmentChange?: InventoryEditorProps["onEnchantmentChange"];
  onUpgradeChange?: InventoryEditorProps["onUpgradeChange"];
}) {
  const name = entry?.name ?? item.id;
  const isCard = kind === "deck";
  const baseVariantName =
    isCard && item.upgradeLevel > 0
      ? `${name}+${item.upgradeLevel}`
      : isCard
        ? `${name}普通版`
        : name;
  const enchantmentEntry = item.enchantment
    ? ENCHANTMENT_BY_ID.get(item.enchantment.id)
    : undefined;
  const enchantmentName = item.enchantment
    ? enchantmentEntry?.name ?? item.enchantment.id
    : "";
  const variantName = enchantmentName
    ? `${baseVariantName}·${enchantmentName}`
    : baseVariantName;
  const canToggleUpgrade =
    isCard &&
    item.upgradeLevel <= 1 &&
    Boolean(onUpgradeChange);
  const isKnownNonEnchantable =
    Boolean(entry) &&
    (NON_ENCHANTABLE_CARD_TYPES.has(entry?.type ?? "") ||
      NON_ENCHANTABLE_CARD_TYPES.has(entry?.rarity ?? ""));
  const advancedStatus = [
    item.upgradeLevel > 0 ? `+${item.upgradeLevel}` : "普通",
    enchantmentName
      ? `${enchantmentName} · ${item.enchantment?.amount}`
      : "无附魔",
  ].join(" · ");

  return (
    <article
      className={`${styles.currentItem} ${
        item.upgradeLevel > 0 || item.enchantment
          ? styles.currentItemSpecial
          : ""
      }`}
    >
      {entry ? (
        <CatalogImage
          className={styles.currentImage}
          entry={entry}
        />
      ) : (
        <span className={styles.unknownImage} aria-hidden="true">
          ?
        </span>
      )}
      <div className={styles.currentCopy}>
        <div className={styles.currentTitle}>
          <strong>{name}</strong>
          {isCard ? (
            <span
              className={`${styles.upgradeBadge} ${
                item.upgradeLevel > 0
                  ? styles.upgradeBadgeActive
                  : ""
              }`}
            >
              {item.upgradeLevel > 0
                ? `+${item.upgradeLevel}`
                : "普通"}
            </span>
          ) : null}
          {item.enchantment ? (
            <span className={styles.enchantmentBadge}>
              {enchantmentName} · {item.enchantment.amount}
            </span>
          ) : null}
        </div>
        <div className={styles.currentMeta}>
          <code>{item.id}</code>
          {entry ? (
            <span>
              {entry.pool} · {entry.rarity}
            </span>
          ) : (
            <span>目录外 ID · 将原样保留</span>
          )}
        </div>

        {isCard ? (
          <details className={styles.cardAdvanced}>
            <summary>
              <span>高级选项</span>
              <small>{advancedStatus}</small>
            </summary>
            <div className={styles.cardAdvancedBody}>
              {canToggleUpgrade ? (
                <div className={styles.cardLevelControl}>
                  <span>
                    <small>卡牌等级</small>
                    <strong>
                      {item.upgradeLevel > 0 ? "+1" : "普通"}
                    </strong>
                  </span>
                  <button
                    aria-label={`${
                      item.upgradeLevel > 0 ? "降级" : "升级"
                    }${variantName}`}
                    className={styles.upgradeButton}
                    onClick={() =>
                      onUpgradeChange?.(
                        item.id,
                        item.upgradeLevel,
                        item.upgradeLevel > 0 ? 0 : 1,
                        item.enchantment,
                      )
                    }
                    type="button"
                  >
                    {item.upgradeLevel > 0 ? "降级" : "升级"}
                  </button>
                </div>
              ) : null}

              {onEnchantmentChange ? (
                isKnownNonEnchantable ? (
                  <span className={styles.enchantmentUnavailable}>
                    任务牌、状态牌和诅咒牌不能添加附魔。
                  </span>
                ) : (
                  <EnchantmentControl
                    cardName={variantName}
                    current={item.enchantment}
                    onApply={(nextEnchantment) =>
                      onEnchantmentChange(
                        item.id,
                        item.upgradeLevel,
                        item.enchantment,
                        nextEnchantment,
                      )
                    }
                  />
                )
              ) : null}
            </div>
          </details>
        ) : null}

        <div
          aria-label={`${variantName}数量`}
          className={styles.quantity}
        >
          <button
            aria-label={`减少${variantName}`}
            disabled={item.count <= 1}
            onClick={() => {
              if (item.count > 1) {
                onCountChange(
                  item.id,
                  item.count - 1,
                  isCard ? item.upgradeLevel : undefined,
                  isCard ? item.enchantment : undefined,
                );
              }
            }}
            type="button"
          >
            <Icon name="minus" />
          </button>
          <input
            aria-label={`${variantName}数量`}
            min="1"
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (Number.isSafeInteger(value)) {
                onCountChange(
                  item.id,
                  Math.max(1, value),
                  isCard ? item.upgradeLevel : undefined,
                  isCard ? item.enchantment : undefined,
                );
              }
            }}
            type="number"
            value={item.count}
          />
          <button
            aria-label={`增加${variantName}`}
            onClick={() =>
              onCountChange(
                item.id,
                item.count + 1,
                isCard ? item.upgradeLevel : undefined,
                isCard ? item.enchantment : undefined,
              )
            }
            type="button"
          >
            <Icon name="plus" />
          </button>
        </div>
        <button
          aria-label={`删除${variantName}`}
          className={styles.iconButton}
          onClick={() =>
            onCountChange(
              item.id,
              0,
              isCard ? item.upgradeLevel : undefined,
              isCard ? item.enchantment : undefined,
            )
          }
          title="删除此版本的全部卡牌"
          type="button"
        >
          <Icon name="trash" />
        </button>
      </div>
    </article>
  );
}

function entryMatches(
  entry: CatalogEntry,
  query: string,
  pool: string,
  rarity: string,
  type: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchesQuery =
    normalizedQuery === "" ||
    entry.name.toLocaleLowerCase().includes(normalizedQuery) ||
    entry.id.toLocaleLowerCase().includes(normalizedQuery) ||
    entry.description.toLocaleLowerCase().includes(normalizedQuery);

  return (
    matchesQuery &&
    (pool === "" || entry.pool === pool) &&
    (rarity === "" || entry.rarity === rarity) &&
    (type === "" || entry.type === type)
  );
}

function uniqueSorted(
  entries: readonly CatalogEntry[],
  field: "pool" | "rarity" | "type",
) {
  return Array.from(
    new Set(
      entries
        .map((entry) => entry[field])
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));
}

export function InventoryEditor({
  catalogLoader,
  kind,
  onCountChange,
  onEnchantmentChange,
  onUpgradeChange,
  playerIndex,
  save,
  title,
}: InventoryEditorProps) {
  const [catalog, setCatalog] = useState<CatalogFile | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [query, setQuery] = useState("");
  const [pool, setPool] = useState("");
  const [rarity, setRarity] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [rawId, setRawId] = useState("");
  const [rawIdError, setRawIdError] = useState("");
  const deferredQuery = useDeferredValue(query);
  const inventory = save.players[playerIndex]?.[kind] ?? [];
  const counts = useMemo(
    () => countInventory(inventory, kind),
    [inventory, kind],
  );
  const uniqueIdCount = useMemo(
    () => new Set(counts.map((entry) => entry.id)).size,
    [counts],
  );
  const countById = useMemo(
    () => {
      const totals = new Map<string, number>();

      for (const entry of counts) {
        totals.set(entry.id, (totals.get(entry.id) ?? 0) + entry.count);
      }

      return totals;
    },
    [counts],
  );
  const countByVariant = useMemo(
    () =>
      new Map(
        counts.map((entry) => [
          inventoryVariantKey(
            entry.id,
            entry.upgradeLevel,
            entry.enchantment,
          ),
          entry.count,
        ]),
      ),
    [counts],
  );
  const catalogById = useMemo(
    () =>
      new Map(
        (catalog?.entries ?? []).map((entry) => [entry.id, entry]),
      ),
    [catalog],
  );

  useEffect(() => {
    let active = true;

    catalogLoader()
      .then((nextCatalog) => {
        if (active) {
          setCatalog(nextCatalog);
          setCatalogError("");
        }
      })
      .catch(() => {
        if (active) {
          setCatalogError("目录加载失败，但仍可使用高级原始 ID 编辑。");
        }
      });

    return () => {
      active = false;
    };
  }, [catalogLoader]);

  const filteredEntries = useMemo(
    () =>
      (catalog?.entries ?? []).filter((entry) =>
        entryMatches(entry, deferredQuery, pool, rarity, type),
      ),
    [catalog, deferredQuery, pool, rarity, type],
  );
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const visibleEntries = filteredEntries.slice(
    (Math.min(page, totalPages) - 1) * PAGE_SIZE,
    Math.min(page, totalPages) * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, pool, rarity, type]);

  const pools = useMemo(
    () => uniqueSorted(catalog?.entries ?? [], "pool"),
    [catalog],
  );
  const rarities = useMemo(
    () => uniqueSorted(catalog?.entries ?? [], "rarity"),
    [catalog],
  );
  const types = useMemo(
    () => uniqueSorted(catalog?.entries ?? [], "type"),
    [catalog],
  );

  function handleRawIdAdd() {
    try {
      const id = normalizeInventoryId(rawId, kind);
      const upgradeLevel = kind === "deck" ? 0 : undefined;
      const currentCount =
        kind === "deck"
          ? countByVariant.get(inventoryVariantKey(id, 0, null)) ?? 0
          : countById.get(id) ?? 0;
      onCountChange(
        id,
        currentCount + 1,
        upgradeLevel,
        kind === "deck" ? null : undefined,
      );
      setRawId("");
      setRawIdError("");
    } catch (error) {
      setRawIdError(
        error instanceof Error ? error.message : "内部 ID 格式不正确。",
      );
    }
  }

  const currentGroups =
    kind === "deck"
      ? [
          {
            id: "special",
            label: "已升级或附魔",
            note: "特殊版本",
            items: counts.filter(
              (item) => item.upgradeLevel > 0 || Boolean(item.enchantment),
            ),
          },
          {
            id: "ordinary",
            label: "普通卡牌",
            note: "未升级 · 无附魔",
            items: counts.filter(
              (item) => item.upgradeLevel === 0 && !item.enchantment,
            ),
          },
        ].filter((group) => group.items.length > 0)
      : [
          {
            id: "all",
            label: "",
            note: "",
            items: counts,
          },
        ];

  return (
    <section aria-labelledby={`${kind}-editor-title`} className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>
            {kind === "deck" ? "DECK WORKBENCH" : "RELIC VAULT"}
          </span>
          <h1 id={`${kind}-editor-title`}>{title}</h1>
          <p>
            当前共有 {inventory.length} 个实例、{uniqueIdCount} 个不同 ID。
            未收录的旧 ID 会原样保留。
          </p>
        </div>
        <span className={styles.sectionBadge}>
          schema {save.schema_version}
        </span>
      </header>

      <div className={styles.inventoryLayout}>
        <section className={styles.currentPanel} aria-label={`当前${title}`}>
          <div className={styles.panelHeading}>
            <div>
              <span>当前内容</span>
              <strong>{inventory.length}</strong>
            </div>
            <small>数量修改会保留其他条目的未知字段</small>
          </div>

          {counts.length === 0 ? (
            <div className={styles.panelEmpty}>这里还没有内容。</div>
          ) : (
            <div className={styles.currentList}>
              {currentGroups.map((group) => (
                <section className={styles.currentGroup} key={group.id}>
                  {group.label ? (
                    <header className={styles.currentGroupHeading}>
                      <div>
                        <strong>{group.label}</strong>
                        <span>
                          {group.items.reduce(
                            (total, item) => total + item.count,
                            0,
                          )}
                        </span>
                      </div>
                      <small>{group.note}</small>
                    </header>
                  ) : null}
                  {group.items.map((item) => (
                    <CurrentInventoryItem
                      entry={catalogById.get(item.id)}
                      item={item}
                      key={inventoryVariantKey(
                        item.id,
                        item.upgradeLevel,
                        item.enchantment,
                      )}
                      kind={kind}
                      onCountChange={onCountChange}
                      onEnchantmentChange={onEnchantmentChange}
                      onUpgradeChange={onUpgradeChange}
                    />
                  ))}
                </section>
              ))}
            </div>
          )}
        </section>

        <section className={styles.catalogPanel} aria-label={`${title}目录`}>
          <div className={styles.catalogHeader}>
            <div>
              <span>灰机 Wiki 静态目录</span>
              <strong>{catalog ? catalog.entries.length : "…"}</strong>
            </div>
            {catalog ? (
              <small>数据版本 {catalog.sourceVersion}</small>
            ) : null}
          </div>

          <div className={styles.catalogFilters}>
            <label className={styles.searchField}>
              <Icon name="search" />
              <span className="visually-hidden">搜索目录</span>
              <input
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="搜索名称、ID 或描述"
                type="search"
                value={query}
              />
            </label>
            <label>
              <span className="visually-hidden">所属池</span>
              <select
                onChange={(event) => setPool(event.currentTarget.value)}
                value={pool}
              >
                <option value="">全部所属池</option>
                {pools.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">稀有度</span>
              <select
                onChange={(event) => setRarity(event.currentTarget.value)}
                value={rarity}
              >
                <option value="">全部稀有度</option>
                {rarities.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            {types.length > 0 ? (
              <label>
                <span className="visually-hidden">类型</span>
                <select
                  onChange={(event) => setType(event.currentTarget.value)}
                  value={type}
                >
                  <option value="">全部类型</option>
                  {types.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div
            aria-label={`${title}目录结果`}
            className={styles.catalogScroll}
            role="region"
            tabIndex={0}
          >
            {catalogError ? (
              <p className={styles.inlineError} role="alert">
                {catalogError}
              </p>
            ) : null}

            {!catalog && !catalogError ? (
              <div className={styles.catalogLoading}>正在载入静态目录…</div>
            ) : (
              <>
                <div className={styles.catalogGrid}>
                  {visibleEntries.map((entry) => {
                    const currentCount = countById.get(entry.id) ?? 0;
                    const baseCount =
                      kind === "deck"
                        ? countByVariant.get(
                            inventoryVariantKey(entry.id, 0, null),
                          ) ?? 0
                        : currentCount;

                    return (
                      <article className={styles.catalogCard} key={entry.id}>
                        <a
                          href={entry.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                          title={`在灰机 Wiki 查看${entry.name}`}
                        >
                          <CatalogImage
                            className={styles.catalogImage}
                            entry={entry}
                          />
                        </a>
                        <div className={styles.catalogCardCopy}>
                          <strong>{entry.name}</strong>
                          <code>{entry.id}</code>
                          <span>
                            {entry.pool} · {entry.rarity}
                            {entry.type ? ` · ${entry.type}` : ""}
                            {entry.cost ? ` · ${entry.cost}费` : ""}
                          </span>
                          <p>{entry.description}</p>
                        </div>
                        <button
                          className={styles.addButton}
                          onClick={() =>
                            onCountChange(
                              entry.id,
                              baseCount + 1,
                              kind === "deck" ? 0 : undefined,
                              kind === "deck" ? null : undefined,
                            )
                          }
                          type="button"
                        >
                          <Icon name="plus" />
                          {currentCount > 0
                            ? kind === "deck"
                              ? `再加一张普通版 · 共 ${currentCount}`
                              : `再加一件 · ${currentCount}`
                            : "添加"}
                        </button>
                      </article>
                    );
                  })}
                </div>

                {filteredEntries.length === 0 ? (
                  <div className={styles.panelEmpty}>没有匹配的目录条目。</div>
                ) : null}

                <div className={styles.pagination}>
                  <span>
                    第 {Math.min(page, totalPages)} / {totalPages} 页 ·
                    {" "}
                    {filteredEntries.length} 项
                  </span>
                  <div>
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      type="button"
                    >
                      上一页
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((value) => Math.min(totalPages, value + 1))
                      }
                      type="button"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <form
            className={styles.rawIdForm}
            onSubmit={(event) => {
              event.preventDefault();
              handleRawIdAdd();
            }}
          >
            <div>
              <strong>高级：使用原始 ID</strong>
              <span>
                {kind === "deck"
                  ? "格式 CARD.[A-Z0-9_]+"
                  : "格式 RELIC.[A-Z0-9_]+"}
              </span>
            </div>
            <label>
              <span className="visually-hidden">原始内部 ID</span>
              <input
                aria-invalid={Boolean(rawIdError)}
                onChange={(event) => {
                  setRawId(event.currentTarget.value);
                  setRawIdError("");
                }}
                placeholder={kind === "deck" ? "CARD.STRIKE_SILENT" : "RELIC.RING_OF_THE_SNAKE"}
                spellCheck="false"
                value={rawId}
              />
            </label>
            <button type="submit">添加 ID</button>
            {rawIdError ? (
              <p className={styles.inlineError} role="alert">
                {rawIdError}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </section>
  );
}
