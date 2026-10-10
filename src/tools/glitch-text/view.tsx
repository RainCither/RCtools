/** @file 展示输入计数、强度预设、高级设置、生成/取消/重置按钮、故障效果预览和复制。 */
import { useController } from "../../bindings/react/controller";
import { useServices } from "../../bindings/react/services";
import { uiClasses } from "../../ui/tool-ui";
import { createController } from "./controller";
/** 提供故障强度、符号位置和 Unicode 范围可调的文字生成界面。 */
import { CopyButton, ToolStatus } from "../../bindings/react/tool-ui";
import { MAX_INPUT_GRAPHEMES, MAX_MARKS_PER_GRAPHEME, isCjkGrapheme } from "./core";
import styles from "./styles.module.css";

import { PLACEMENT_OPTIONS, PRESETS, RANGE_OPTIONS } from "./definitions";
type OptionToggleProps<T extends string> = {
  id: T;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (id: T, checked: boolean) => void;
};

/** 渲染带标签与说明的通用高级选项开关。 */
function OptionToggle<T extends string>({
  id,
  label,
  hint,
  checked,
  onChange,
}: OptionToggleProps<T>) {
  return (
    <label className={styles.option}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(id, event.target.checked)}
      />
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
    </label>
  );
}

/** 渲染故障文字输入、预设、高级设置和安全预览。 */

export default function ToolView() {
  const ports = useServices();
  const { snapshot: model, actions } = useController(() => createController(ports));
  const {
    input,
    preset,
    noiseRange,
    placements,
    ranges,
    cjkCompatible,
    result,
    error,
    inputGraphemes,
    resultGraphemes,
    statusMessage,
    busy,
  } = model;
  const {
    setCjkCompatible,
    markDirty,
    changeInput,
    applyPreset,
    changeNoiseBoundary,
    changePlacement,
    changeRange,
    generate,
    reset,
  } = actions;

  return (
    <div className={uiClasses(`tool-form ${styles.tool}`)}>
      <div className={styles.inputHeading}>
        <label className={uiClasses("field-label")} htmlFor="glitch-text-input">
          输入文字
        </label>
        <span
          className={
            inputGraphemes !== null && inputGraphemes > MAX_INPUT_GRAPHEMES
              ? styles.countError
              : undefined
          }
        >
          {inputGraphemes === null ? "生成时统计" : inputGraphemes.toLocaleString("zh-CN")} /{" "}
          {MAX_INPUT_GRAPHEMES.toLocaleString("zh-CN")}
        </span>
      </div>
      <textarea
        id="glitch-text-input"
        className={uiClasses("tool-textarea")}
        value={input}
        onChange={(event) => changeInput(event.target.value)}
        placeholder="输入中文、英文或符号，例如：SYSTEM ERROR"
        aria-describedby="glitch-text-help"
      />
      <p className={styles.help} id="glitch-text-help">
        Zalgo 效果由真实 Unicode 组合字符叠加而成，复制时会一起保留。空格和换行保持不变；Emoji
        会按完整字素处理，不拆开连接序列。
      </p>

      <fieldset className={styles.intensity}>
        <legend className={uiClasses("field-label")}>故障强度</legend>
        <div className={styles.presetGrid}>
          {PRESETS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={preset === option.id ? styles.presetActive : undefined}
              aria-pressed={preset === option.id}
              onClick={() => applyPreset(option.id)}
            >
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <details className={styles.advanced}>
        <summary>
          <span>高级设置</span>
          <small>{preset === "custom" ? "自定义强度" : "位置与 Unicode 范围"}</small>
        </summary>
        <div className={styles.advancedBody}>
          <fieldset className={styles.customRange}>
            <legend className={uiClasses("field-label")}>每个字素的组合符数量</legend>
            <label>
              <span>最少</span>
              <input
                className={uiClasses("tool-input")}
                type="number"
                min="0"
                max={MAX_MARKS_PER_GRAPHEME}
                value={noiseRange.min}
                onChange={(event) => changeNoiseBoundary("min", Number(event.target.value))}
              />
            </label>
            <label>
              <span>最多</span>
              <input
                className={uiClasses("tool-input")}
                type="number"
                min="0"
                max={MAX_MARKS_PER_GRAPHEME}
                value={noiseRange.max}
                onChange={(event) => changeNoiseBoundary("max", Number(event.target.value))}
              />
            </label>
            <p>范围会自动调整为 0–{MAX_MARKS_PER_GRAPHEME}；最小值大于最大值时自动交换。</p>
          </fieldset>

          <fieldset className={styles.optionGrid}>
            <legend className={uiClasses("field-label")}>符号位置</legend>
            {PLACEMENT_OPTIONS.map((option) => (
              <OptionToggle
                key={option.id}
                {...option}
                checked={placements[option.id]}
                onChange={changePlacement}
              />
            ))}
          </fieldset>

          <fieldset className={styles.optionGrid}>
            <legend className={uiClasses("field-label")}>Unicode 字符范围</legend>
            {RANGE_OPTIONS.map((option) => (
              <OptionToggle
                key={option.id}
                {...option}
                checked={ranges[option.id]}
                onChange={changeRange}
              />
            ))}
          </fieldset>
          <OptionToggle
            id="cjkCompatible"
            label="中文兼容模式"
            hint="仅使用少量上方与包围符号；关闭可生成完整叠加效果"
            checked={cjkCompatible}
            onChange={(_, checked) => {
              setCjkCompatible(checked);
              markDirty();
            }}
          />
          <p className={styles.experimentalNote}>
            扩展、补充、数学符号与 Unicode 17 属于实验效果，显示外观取决于系统字体。
          </p>
        </div>
      </details>

      <div className={uiClasses(`tool-actions ${styles.actions}`)}>
        <button
          className={uiClasses("button button-primary")}
          type="button"
          onClick={generate}
          disabled={busy}
        >
          {result ? "重新生成" : "生成故障文字"}
        </button>
        {busy && (
          <button
            type="button"
            className={uiClasses("button button-secondary")}
            onClick={actions.cancel}
          >
            取消计算
          </button>
        )}
        <CopyButton value={result?.text ?? ""} />
        <button className={uiClasses("button button-secondary")} type="button" onClick={reset}>
          重置
        </button>
      </div>

      {!model.retained && <p role="status">输入过大，离开页面后不会保留。</p>}
      <ToolStatus error={error} message={busy ? "正在生成…" : statusMessage} />

      <div className={styles.resultSection}>
        <div className={styles.resultHeading}>
          <span className={uiClasses("field-label")}>结果预览</span>
          <small>为避免干扰，屏幕阅读器不会朗读故障字符</small>
        </div>
        <div className={styles.output} aria-hidden="true">
          {result
            ? resultGraphemes.map((grapheme, index) => (
                <span
                  className={isCjkGrapheme(grapheme) ? styles.cjkGrapheme : styles.otherGrapheme}
                  key={`${index}-${grapheme}`}
                >
                  {grapheme}
                </span>
              ))
            : "生成结果会显示在这里"}
        </div>
      </div>
    </div>
  );
}
