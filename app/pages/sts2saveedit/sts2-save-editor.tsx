import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon, SectionIcon } from "./icons";
import {
  cloneSts2Save,
  getModifiedSaveName,
  hasStructuralValidationErrors,
  hasValidationErrors,
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
} from "./save-core";
import styles from "./styles.module.css";
import type {
  EditorSection,
  InventoryKind,
  MapNodeType,
  Sts2CardEnchantment,
  Sts2Save,
  SupportedNumberField,
} from "./types";

const CardEditor = lazy(() => import("./card-editor"));
const RelicEditor = lazy(() => import("./relic-editor"));
const MiscEditor = lazy(() => import("./misc-editor"));
const MapEditor = lazy(() => import("./map-editor"));

const SECTIONS: readonly {
  id: EditorSection;
  label: string;
  note: string;
}[] = [
  { id: "cards", label: "卡牌修改", note: "牌组与目录" },
  { id: "relics", label: "遗物修改", note: "持有与目录" },
  { id: "misc", label: "杂项", note: "金币与属性" },
  { id: "map", label: "地图修改", note: "节点类型" },
];

type ImportedFile = {
  name: string;
  size: number;
};

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KiB`;
}

export function Sts2SaveEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<Sts2Save | null>(null);
  const [draft, setDraft] = useState<Sts2Save | null>(null);
  const [file, setFile] = useState<ImportedFile | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSection>("cards");
  const [playerIndex, setPlayerIndex] = useState(0);
  const [changes, setChanges] = useState<string[]>([]);
  const [fileError, setFileError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const issues = useMemo(() => (draft ? validateSts2Save(draft) : []), [draft]);
  const hasErrors = hasValidationErrors(issues);

  const loadSaveSource = useCallback(
    (source: string, importedFile: ImportedFile) => {
      const parsed = parseSts2Save(source);
      const importedIssues = validateSts2Save(parsed);
      const firstStructuralIssue = importedIssues.find((issue) =>
        hasStructuralValidationErrors([issue]),
      );

      if (firstStructuralIssue) {
        throw new Error(
          `存档结构验证失败：${firstStructuralIssue.path} ${firstStructuralIssue.message}`,
        );
      }

      const nextOriginal = cloneSts2Save(parsed);

      setOriginal(nextOriginal);
      setDraft(cloneSts2Save(parsed));
      setFile(importedFile);
      setPlayerIndex(0);
      setActiveSection("cards");
      setChanges([]);
      setFileError("");
      setActionMessage(`已在本地载入 ${importedFile.name}`);
    },
    [],
  );

  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      new URLSearchParams(window.location.search).get("qa-fixture") !== "1"
    ) {
      return;
    }

    fetch("/tests/fixtures/sts2-schema14-minimal.save")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("开发验收 fixture 加载失败。");
        }

        const source = await response.text();
        loadSaveSource(source, {
          name: "sts2-schema14-minimal.save",
          size: new TextEncoder().encode(source).byteLength,
        });
      })
      .catch((error: unknown) => {
        setFileError(
          error instanceof Error
            ? error.message
            : "开发验收 fixture 加载失败。",
        );
      });
  }, [loadSaveSource]);

  const applyDraft = useCallback((next: Sts2Save, description: string) => {
    setDraft(next);
    setChanges((current) => [description, ...current]);
    setActionMessage(description);
  }, []);

  async function importFile(selectedFile: File) {
    try {
      const source = (await selectedFile.text()).replace(/^\uFEFF/, "");
      loadSaveSource(source, {
        name: selectedFile.name,
        size: selectedFile.size,
      });
    } catch (error) {
      setOriginal(null);
      setDraft(null);
      setFile(null);
      setChanges([]);
      setFileError(error instanceof Error ? error.message : "存档读取失败。");
      setActionMessage("");
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleReset() {
    if (!original) {
      return;
    }

    setDraft(cloneSts2Save(original));
    setChanges([]);
    setActionMessage("已恢复到本次导入时的状态。");
  }

  function handleExport() {
    if (!draft || !file || hasErrors) {
      return;
    }

    try {
      const source = serializeSts2Save(draft);
      const blob = new Blob([source], {
        type: "application/json;charset=utf-8",
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.download = getModifiedSaveName(file.name);
      anchor.href = objectUrl;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setActionMessage(`已生成 ${anchor.download}，原文件未被覆盖。`);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "存档导出失败。");
    }
  }

  const handleInventoryCount = useCallback(
    (
      kind: InventoryKind,
      id: string,
      nextCount: number,
      upgradeLevel?: number,
      enchantment?: Sts2CardEnchantment | null,
    ) => {
      if (!draft) {
        return;
      }

      try {
        const next = setInventoryCount(
          draft,
          playerIndex,
          kind,
          id,
          nextCount,
          upgradeLevel,
          enchantment,
        );
        const noun = kind === "deck" ? "卡牌" : "遗物";
        const version =
          kind === "deck"
            ? upgradeLevel && upgradeLevel > 0
              ? ` +${upgradeLevel}`
              : " 普通版"
            : "";
        applyDraft(next, `${noun} ${id}${version} 的数量改为 ${nextCount}`);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "数量修改失败。");
      }
    },
    [applyDraft, draft, playerIndex],
  );

  const handleCardUpgradeLevel = useCallback(
    (
      id: string,
      currentLevel: number,
      nextLevel: 0 | 1,
      enchantment?: Sts2CardEnchantment | null,
    ) => {
      if (!draft) {
        return;
      }

      try {
        const next = setCardUpgradeLevel(
          draft,
          playerIndex,
          id,
          currentLevel,
          nextLevel,
          enchantment,
        );
        applyDraft(
          next,
          `${id} ${nextLevel === 1 ? "升级为 +1" : "降级为普通版"}`,
        );
      } catch (error) {
        setFileError(
          error instanceof Error ? error.message : "卡牌升级修改失败。",
        );
      }
    },
    [applyDraft, draft, playerIndex],
  );

  const handleCardEnchantment = useCallback(
    (
      id: string,
      upgradeLevel: number,
      currentEnchantment: Sts2CardEnchantment | null,
      nextEnchantment: Sts2CardEnchantment | null,
    ) => {
      if (!draft) {
        return;
      }

      try {
        const next = setCardEnchantment(
          draft,
          playerIndex,
          id,
          upgradeLevel,
          currentEnchantment,
          nextEnchantment,
        );
        applyDraft(
          next,
          nextEnchantment
            ? `${id} 添加附魔 ${nextEnchantment.id} · ${nextEnchantment.amount}`
            : `${id} 移除附魔`,
        );
      } catch (error) {
        setFileError(
          error instanceof Error ? error.message : "卡牌附魔修改失败。",
        );
      }
    },
    [applyDraft, draft, playerIndex],
  );

  const handleNumberChange = useCallback(
    (field: SupportedNumberField, value: number) => {
      if (!draft) {
        return;
      }

      try {
        const next = updatePlayerNumber(draft, playerIndex, field, value);
        applyDraft(next, `玩家 ${playerIndex + 1} 的 ${field} 改为 ${value}`);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "数值修改失败。");
      }
    },
    [applyDraft, draft, playerIndex],
  );

  const handleAscensionChange = useCallback(
    (value: number) => {
      if (!draft) {
        return;
      }

      try {
        const next = updateAscension(draft, value);
        applyDraft(next, `进阶等级改为 ${value}`);
      } catch (error) {
        setFileError(
          error instanceof Error ? error.message : "进阶等级修改失败。",
        );
      }
    },
    [applyDraft, draft],
  );

  const handlePotionChange = useCallback(
    (slotIndex: number, id: string | null) => {
      if (!draft) {
        return;
      }

      try {
        const next = setPotionAtSlot(draft, playerIndex, slotIndex, id);
        applyDraft(
          next,
          id
            ? `玩家 ${playerIndex + 1} 的药水槽 ${slotIndex + 1} 改为 ${id}`
            : `清空玩家 ${playerIndex + 1} 的药水槽 ${slotIndex + 1}`,
        );
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "药水修改失败。");
      }
    },
    [applyDraft, draft, playerIndex],
  );

  const handleNodeTypeChange = useCallback(
    (col: number, row: number, type: MapNodeType) => {
      if (!draft) {
        return;
      }

      try {
        const next = setMapNodeType(draft, col, row, type);
        applyDraft(next, `当前地图节点 (${col}, ${row}) 改为 ${type}`);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "地图修改失败。");
      }
    },
    [applyDraft, draft],
  );

  const player = draft?.players[playerIndex] ?? null;

  return (
    <div className={styles.app}>
      <input
        accept=".save,application/json"
        className="visually-hidden"
        onChange={(event) => {
          const selectedFile = event.currentTarget.files?.[0];
          if (selectedFile) {
            void importFile(selectedFile);
          }
        }}
        ref={inputRef}
        type="file"
      />

      <header className={styles.commandBar}>
        <a className={styles.brand} href={import.meta.env.BASE_URL}>
          <Icon name="back" />
          <span>
            <small>返回 RCtools</small>
            <strong>杀戮尖塔 2 存档修改器</strong>
          </span>
        </a>

        <div className={styles.fileStatus}>
          <span
            className={`${styles.statusLight} ${
              draft && !hasErrors ? styles.statusLightReady : ""
            }`}
          />
          <div>
            <strong>{file?.name ?? "尚未载入存档"}</strong>
            <span>
              {file
                ? `${formatFileSize(file.size)} · schema ${draft?.schema_version ?? "?"}`
                : "文件只会在当前浏览器中处理"}
            </span>
          </div>
        </div>

        <div className={styles.commandActions}>
          <button
            className={styles.commandButton}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Icon name="upload" />
            {file ? "重新导入" : "导入存档"}
          </button>
          <button
            className={styles.commandButton}
            disabled={!draft || changes.length === 0}
            onClick={handleReset}
            type="button"
          >
            <Icon name="reset" />
            重置
          </button>
          <button
            className={styles.exportButton}
            disabled={!draft || hasErrors}
            onClick={handleExport}
            type="button"
          >
            <Icon name="download" />
            导出副本
          </button>
        </div>
      </header>

      {!draft ? (
        <main className={styles.emptyWorkspace}>
          <div className={styles.emptySigil} aria-hidden="true">
            <Icon name="cards" />
          </div>
          <span className={styles.eyebrow}>LOCAL SAVE WORKBENCH</span>
          <h1>杀戮尖塔 2 存档修改器</h1>
          <p>
            导入 <code>.save</code> 文件后修改卡牌、遗物、属性与地图节点。
            解析、编辑和导出全部在浏览器本地完成，不会上传存档。
          </p>
          <button
            className={styles.emptyImportButton}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Icon name="upload" />
            选择存档文件
          </button>
          <dl className={styles.emptyFacts}>
            <div>
              <dt>已验证版本</dt>
              <dd>schema 14</dd>
            </div>
            <div>
              <dt>导出方式</dt>
              <dd>新建 modified.save</dd>
            </div>
            <div>
              <dt>数据边界</dt>
              <dd>纯前端 · 不上传</dd>
            </div>
          </dl>
          {fileError ? (
            <p className={styles.emptyError} role="alert">
              <Icon name="warning" />
              {fileError}
            </p>
          ) : null}
        </main>
      ) : (
        <div className={styles.workspace}>
          <nav aria-label="编辑区域" className={styles.sectionNav}>
            <div className={styles.playerMark}>
              <span>{player?.character_id.split(".").at(-1)?.slice(0, 2)}</span>
              <div>
                <strong>{player?.character_id ?? "未知角色"}</strong>
                <small>玩家 {playerIndex + 1}</small>
              </div>
            </div>

            {draft.players.length > 1 ? (
              <label className={styles.playerPicker}>
                <span>选择玩家</span>
                <select
                  onChange={(event) =>
                    setPlayerIndex(Number(event.currentTarget.value))
                  }
                  value={playerIndex}
                >
                  {draft.players.map((entry, index) => (
                    <option
                      key={`${entry.character_id}-${index}`}
                      value={index}
                    >
                      玩家 {index + 1} · {entry.character_id}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className={styles.navItems}>
              {SECTIONS.map((section, index) => (
                <button
                  aria-current={
                    activeSection === section.id ? "page" : undefined
                  }
                  className={
                    activeSection === section.id ? styles.navItemActive : ""
                  }
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <span className={styles.navIndex}>0{index + 1}</span>
                  <SectionIcon section={section.id} />
                  <span>
                    <strong>{section.label}</strong>
                    <small>{section.note}</small>
                  </span>
                  {section.id === "cards" ? (
                    <b>{player?.deck.length ?? 0}</b>
                  ) : null}
                  {section.id === "relics" ? (
                    <b>{player?.relics.length ?? 0}</b>
                  ) : null}
                </button>
              ))}
            </div>

            <aside className={styles.localNote}>
              <Icon name="check" />
              <div>
                <strong>本地处理</strong>
                <span>存档不会离开此浏览器标签页</span>
              </div>
            </aside>
          </nav>

          <main className={styles.editorMain}>
            <Suspense
              fallback={
                <div className={styles.sectionLoading}>正在载入编辑区域…</div>
              }
            >
              {activeSection === "cards" ? (
                <CardEditor
                  onCountChange={(id, count, upgradeLevel, enchantment) =>
                    handleInventoryCount(
                      "deck",
                      id,
                      count,
                      upgradeLevel,
                      enchantment,
                    )
                  }
                  onEnchantmentChange={handleCardEnchantment}
                  onUpgradeChange={handleCardUpgradeLevel}
                  playerIndex={playerIndex}
                  save={draft}
                />
              ) : null}
              {activeSection === "relics" ? (
                <RelicEditor
                  onCountChange={(id, count) =>
                    handleInventoryCount("relics", id, count)
                  }
                  playerIndex={playerIndex}
                  save={draft}
                />
              ) : null}
              {activeSection === "misc" ? (
                <MiscEditor
                  onAscensionChange={handleAscensionChange}
                  onNumberChange={handleNumberChange}
                  onPotionChange={handlePotionChange}
                  playerIndex={playerIndex}
                  save={draft}
                />
              ) : null}
              {activeSection === "map" ? (
                <MapEditor
                  onNodeTypeChange={handleNodeTypeChange}
                  save={draft}
                />
              ) : null}
            </Suspense>
          </main>
        </div>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerStatus}>
          {draft ? (
            hasErrors ? (
              <>
                <Icon name="warning" />
                <span>{issues.length} 个校验问题，修复后才能导出</span>
              </>
            ) : (
              <>
                <Icon name="check" />
                <span>校验通过 · {changes.length} 项未导出变更</span>
              </>
            )
          ) : (
            <span>等待导入存档</span>
          )}
        </div>
        <p aria-live="polite" className={styles.liveMessage}>
          {fileError || actionMessage}
        </p>
        <p className={styles.attribution}>
          卡牌、遗物数据与图片来自{" "}
          <a
            href="https://sts2.huijiwiki.com/wiki/%E9%A6%96%E9%A1%B5"
            rel="noreferrer"
            target="_blank"
          >
            杀戮尖塔 2 灰机 Wiki
          </a>
          ，遵循{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans"
            rel="noreferrer"
            target="_blank"
          >
            CC BY-NC-SA 4.0
          </a>
          。
        </p>
      </footer>

      {draft && issues.length > 0 ? (
        <details className={styles.validationDetails}>
          <summary>
            <Icon name="warning" />
            查看 {issues.length} 个校验问题
          </summary>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${issue.path}-${index}`}>
                <code>{issue.path}</code>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {draft && changes.length > 0 ? (
        <details className={styles.changeLogDetails}>
          <summary>
            <Icon name="reset" />
            查看 {changes.length} 项变更记录
          </summary>
          <ol>
            {changes.map((change, index) => (
              <li key={`${change}-${index}`}>{change}</li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
