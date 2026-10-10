/** @file 展示文本输入框、统计状态和四项统计卡片，提示过大输入无法在离开后保留。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 实时统计文本字符数、非空白字符、字词与行数。 */
import { ToolStatus } from "../../ui/tool-ui";
import styles from "./styles.module.css";

/** 渲染文本输入框和随输入派生的统计结果。 */
export default function ToolView() {
  const usePorts = useServices();
  const { snapshot: s, actions } = useController(() => createController(usePorts));
  const input = s.draft,
    stats = s.output;
  const setInput = actions.update;

  return (
    <div className={uiClasses("tool-form")}>
      <label className={uiClasses("field-label")} htmlFor="stats-input">
        输入文本
      </label>
      <textarea
        id="stats-input"
        className={uiClasses("tool-textarea")}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="粘贴或输入要统计的文本…"
      />
      <ToolStatus
        error={s.error?.message}
        message={s.status === "running" || s.status === "pending" ? "正在统计…" : "统计完成。"}
      />
      {!s.retained && <p role="status">输入过大，离开页面后不会保留。</p>}
      <div className={styles.statGrid} aria-live="polite">
        <div>
          <span>字符数</span>
          <strong>{stats.characters}</strong>
        </div>
        <div>
          <span>不含空格</span>
          <strong>{stats.noSpaces}</strong>
        </div>
        <div>
          <span>字词数</span>
          <strong>{stats.words}</strong>
        </div>
        <div>
          <span>行数</span>
          <strong>{stats.lines}</strong>
        </div>
      </div>
    </div>
  );
}
