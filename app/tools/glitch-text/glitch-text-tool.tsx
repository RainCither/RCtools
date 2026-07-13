"use client";

import { useMemo, useState } from "react";
import { CopyButton, ToolStatus } from "../shared/tool-ui";
import {
  MAX_INPUT_GRAPHEMES,
  MAX_MARKS_PER_GRAPHEME,
  clampNoiseRange,
  countGraphemes,
  generateGlitchTextResult,
  isCjkGrapheme,
  segmentGraphemes,
  type GlitchMarkPlacement,
  type GlitchMarkRange,
  type GlitchTextResult,
  type NoiseRange,
} from "./glitch-text-core";
import styles from "./styles.module.css";

type IntensityPreset = "light" | "medium" | "heavy" | "custom";

const PRESETS: ReadonlyArray<{
  id: Exclude<IntensityPreset, "custom">;
  label: string;
  hint: string;
  range: NoiseRange;
}> = [
  { id: "light", label: "轻微", hint: "1–2 个", range: { min: 1, max: 2 } },
  { id: "medium", label: "中等", hint: "3–6 个", range: { min: 3, max: 6 } },
  { id: "heavy", label: "重度", hint: "7–12 个", range: { min: 7, max: 12 } },
];

const PLACEMENT_OPTIONS: ReadonlyArray<{
  id: GlitchMarkPlacement;
  label: string;
  hint: string;
}> = [
  { id: "above", label: "上方", hint: "重音与上标符号" },
  { id: "below", label: "下方", hint: "下划与下标符号" },
  { id: "middle", label: "穿透", hint: "删除线与覆盖符号" },
  { id: "enclosing", label: "包围", hint: "仅符号范围有效" },
];

const RANGE_OPTIONS: ReadonlyArray<{
  id: GlitchMarkRange;
  label: string;
  hint: string;
}> = [
  { id: "basic", label: "基础字符", hint: "兼容性最好，推荐默认使用" },
  { id: "extended", label: "扩展字符", hint: "更多语音与形状符号" },
  { id: "supplement", label: "补充字符", hint: "字母、箭头与轮廓符号" },
  { id: "symbols", label: "数学符号", hint: "包含覆盖和包围效果" },
  { id: "unicode17", label: "Unicode 17", hint: "新字符，字体支持可能有限" },
];

const DEFAULT_PLACEMENTS: Record<GlitchMarkPlacement, boolean> = {
  above: true,
  below: true,
  middle: true,
  enclosing: false,
};

const DEFAULT_RANGES: Record<GlitchMarkRange, boolean> = {
  basic: true,
  extended: false,
  supplement: false,
  symbols: false,
  unicode17: false,
};

type OptionToggleProps<T extends string> = {
  id: T;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (id: T, checked: boolean) => void;
};

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

function freshPlacements() {
  return { ...DEFAULT_PLACEMENTS };
}

function freshRanges() {
  return { ...DEFAULT_RANGES };
}

export default function GlitchTextTool() {
  const [input, setInput] = useState("");
  const [preset, setPreset] = useState<IntensityPreset>("medium");
  const [noiseRange, setNoiseRange] = useState<NoiseRange>({ min: 3, max: 6 });
  const [placements, setPlacements] = useState(freshPlacements);
  const [ranges, setRanges] = useState(freshRanges);
  const [result, setResult] = useState<GlitchTextResult | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const inputGraphemes = useMemo(() => countGraphemes(input), [input]);
  const resultGraphemes = useMemo(
    () => result ? segmentGraphemes(result.text) : [],
    [result],
  );

  function markDirty() {
    if (result) setDirty(true);
    setError("");
  }

  function changeInput(value: string) {
    setInput(value);
    markDirty();
  }

  function applyPreset(nextPreset: Exclude<IntensityPreset, "custom">) {
    const selected = PRESETS.find(({ id }) => id === nextPreset);
    if (!selected) return;
    setPreset(nextPreset);
    setNoiseRange(selected.range);
    markDirty();
  }

  function changeNoiseBoundary(boundary: keyof NoiseRange, value: number) {
    setPreset("custom");
    setNoiseRange((current) => ({ ...current, [boundary]: value }));
    markDirty();
  }

  function changePlacement(id: GlitchMarkPlacement, checked: boolean) {
    setPlacements((current) => ({ ...current, [id]: checked }));
    markDirty();
  }

  function changeRange(id: GlitchMarkRange, checked: boolean) {
    setRanges((current) => ({ ...current, [id]: checked }));
    markDirty();
  }

  function generate() {
    if (!input.trim()) {
      setResult(null);
      setError("请输入要生成故障效果的文字。");
      setDirty(false);
      return;
    }
    if (inputGraphemes > MAX_INPUT_GRAPHEMES) {
      setResult(null);
      setError(`输入不能超过 ${MAX_INPUT_GRAPHEMES.toLocaleString("zh-CN")} 个字素。`);
      setDirty(false);
      return;
    }

    const selectedPlacements = PLACEMENT_OPTIONS
      .filter(({ id }) => placements[id])
      .map(({ id }) => id);
    const selectedRanges = RANGE_OPTIONS
      .filter(({ id }) => ranges[id])
      .map(({ id }) => id);
    if (!selectedPlacements.length) {
      setError("请至少选择一个符号位置。");
      return;
    }
    if (!selectedRanges.length) {
      setError("请至少选择一个 Unicode 字符范围。");
      return;
    }

    const generated = generateGlitchTextResult(
      input,
      clampNoiseRange(noiseRange.min, noiseRange.max),
      { placements: selectedPlacements, ranges: selectedRanges },
    );
    if (generated.renderableGraphemes === 0) {
      setResult(null);
      setError("输入中没有可以添加故障效果的可见字符。");
      setDirty(false);
      return;
    }
    if (generated.marksAdded === 0) {
      setResult(null);
      setError("所选位置与字符范围没有可用组合，请调整高级设置。");
      setDirty(false);
      return;
    }

    setNoiseRange(clampNoiseRange(noiseRange.min, noiseRange.max));
    setResult(generated);
    setError("");
    setDirty(false);
  }

  function reset() {
    setInput("");
    setPreset("medium");
    setNoiseRange({ min: 3, max: 6 });
    setPlacements(freshPlacements());
    setRanges(freshRanges());
    setResult(null);
    setError("");
    setDirty(false);
  }

  const statusMessage = dirty
    ? "输入或设置已更改，点击“重新生成”更新结果。"
    : result
      ? `已处理 ${result.renderableGraphemes.toLocaleString("zh-CN")} 个可见字素，添加 ${result.marksAdded.toLocaleString("zh-CN")} 个组合符${result.marksLimited ? "，已达到输出上限" : ""}。`
      : `最多输入 ${MAX_INPUT_GRAPHEMES.toLocaleString("zh-CN")} 个字素；结果只在点击生成时更新。`;

  return (
    <div className={`tool-form ${styles.tool}`}>
      <div className={styles.inputHeading}>
        <label className="field-label" htmlFor="glitch-text-input">输入文字</label>
        <span className={inputGraphemes > MAX_INPUT_GRAPHEMES ? styles.countError : undefined}>
          {inputGraphemes.toLocaleString("zh-CN")} / {MAX_INPUT_GRAPHEMES.toLocaleString("zh-CN")}
        </span>
      </div>
      <textarea
        id="glitch-text-input"
        className="tool-textarea"
        value={input}
        onChange={(event) => changeInput(event.target.value)}
        placeholder="输入中文、英文或符号，例如：SYSTEM ERROR"
        aria-describedby="glitch-text-help"
      />
      <p className={styles.help} id="glitch-text-help">
        空格和换行保持不变；Emoji 会按完整字素处理，不拆开连接序列。
      </p>

      <fieldset className={styles.intensity}>
        <legend className="field-label">故障强度</legend>
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
            <legend className="field-label">每个字素的组合符数量</legend>
            <label>
              <span>最少</span>
              <input
                className="tool-input"
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
                className="tool-input"
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
            <legend className="field-label">符号位置</legend>
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
            <legend className="field-label">Unicode 字符范围</legend>
            {RANGE_OPTIONS.map((option) => (
              <OptionToggle
                key={option.id}
                {...option}
                checked={ranges[option.id]}
                onChange={changeRange}
              />
            ))}
          </fieldset>
          <p className={styles.experimentalNote}>
            扩展、补充、数学符号与 Unicode 17 属于实验效果，显示外观取决于系统字体。
          </p>
        </div>
      </details>

      <div className={`tool-actions ${styles.actions}`}>
        <button className="button button-primary" type="button" onClick={generate}>
          {result ? "重新生成" : "生成故障文字"}
        </button>
        <CopyButton value={result?.text ?? ""} />
        <button className="button button-secondary" type="button" onClick={reset}>
          重置
        </button>
      </div>

      <ToolStatus error={error} message={statusMessage} />

      <div className={styles.resultSection}>
        <div className={styles.resultHeading}>
          <span className="field-label">结果预览</span>
          <small>为避免干扰，屏幕阅读器不会朗读故障字符</small>
        </div>
        <div className={styles.output} aria-hidden="true">
          {result ? resultGraphemes.map((grapheme, index) => (
            <span
              className={isCjkGrapheme(grapheme)
                ? styles.cjkGrapheme
                : styles.otherGrapheme}
              key={`${index}-${grapheme}`}
            >
              {grapheme}
            </span>
          )) : "生成结果会显示在这里"}
        </div>
      </div>
    </div>
  );
}
