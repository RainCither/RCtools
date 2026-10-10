/** @file 保存强度预设、组合符位置和 Unicode 范围选项，以及对应名称、说明和类型。 */
import type { GlitchMarkPlacement, GlitchMarkRange, NoiseRange } from "./core";
/** 故障强度预设标识，自定义模式表示当前数量不再跟随固定预设。 */
export type IntensityPreset = "light" | "medium" | "heavy" | "eldritch" | "custom";
export const PRESETS: ReadonlyArray<{
  id: Exclude<IntensityPreset, "custom">;
  label: string;
  hint: string;
  range: NoiseRange;
}> = [
  { id: "light", label: "轻微", hint: "1–2 个", range: { min: 1, max: 2 } },
  { id: "medium", label: "中等", hint: "3–6 个", range: { min: 3, max: 6 } },
  { id: "heavy", label: "重度", hint: "7–12 个", range: { min: 7, max: 12 } },
  { id: "eldritch", label: "邪神", hint: "20–40 个 · 环绕", range: { min: 20, max: 40 } },
];
export const PLACEMENT_OPTIONS: ReadonlyArray<{
  id: GlitchMarkPlacement;
  label: string;
  hint: string;
}> = [
  { id: "above", label: "上方", hint: "重音与上标符号" },
  { id: "below", label: "下方", hint: "下划与下标符号" },
  { id: "middle", label: "穿透", hint: "删除线与覆盖符号" },
  { id: "enclosing", label: "包围", hint: "数学或西里尔符号范围有效" },
];
export const RANGE_OPTIONS: ReadonlyArray<{
  id: GlitchMarkRange;
  label: string;
  hint: string;
}> = [
  { id: "cyrillic", label: "西里尔环绕符", hint: "҈ / ҉，搭配包围位置使用" },
  { id: "basic", label: "基础字符", hint: "兼容性最好，推荐默认使用" },
  { id: "extended", label: "扩展字符", hint: "更多语音与形状符号" },
  { id: "supplement", label: "补充字符", hint: "字母、箭头与轮廓符号" },
  { id: "symbols", label: "数学符号", hint: "包含覆盖和包围效果" },
  { id: "unicode17", label: "Unicode 17", hint: "新字符，字体支持可能有限" },
];
