import { createModelController } from "../../contracts/model";
import type { ControllerPorts } from "../../contracts/ports";
import {
  MAX_INPUT_GRAPHEMES,
  clampNoiseRange,
  countGraphemes,
  segmentGraphemes,
  type GlitchMarkPlacement,
  type GlitchMarkRange,
  type GlitchTextResult,
  type NoiseRange,
} from "./core";
import type { IntensityPreset } from "./definitions";
import { PLACEMENT_OPTIONS, PRESETS, RANGE_OPTIONS } from "./definitions";
const DEFAULT_PLACEMENTS: Record<GlitchMarkPlacement, boolean> = {
  above: true,
  below: true,
  middle: true,
  enclosing: false,
};
const DEFAULT_RANGES: Record<GlitchMarkRange, boolean> = {
  cyrillic: false,
  basic: true,
  extended: false,
  supplement: false,
  symbols: false,
  unicode17: false,
};
function freshPlacements() {
  return { ...DEFAULT_PLACEMENTS };
}
function freshRanges() {
  return { ...DEFAULT_RANGES };
}
export function createController(ports: ControllerPorts) {
  return createModelController(
    "glitch-text",
    {
      input: "",
      preset: "medium",
      noiseRange: { min: 3, max: 6 },
      placements: freshPlacements(),
      ranges: freshRanges(),
      cjkCompatible: false,
      result: null,
      error: "",
      dirty: false,
      busy: false,
    } as {
      input: string;
      preset: IntensityPreset;
      noiseRange: NoiseRange;
      placements: { above: boolean; below: boolean; middle: boolean; enclosing: boolean };
      ranges: {
        cyrillic: boolean;
        basic: boolean;
        extended: boolean;
        supplement: boolean;
        symbols: boolean;
        unicode17: boolean;
      };
      cjkCompatible: boolean;
      result: GlitchTextResult | null;
      error: string;
      dirty: boolean;
      busy: boolean;
    },
    (state, set, run) => {
      const input = state.input;
      const setInput = (value: string | ((current: string) => string)) => set("input", value);
      const preset = state.preset;
      const setPreset = (
        value: IntensityPreset | ((current: IntensityPreset) => IntensityPreset),
      ) => set("preset", value);
      const noiseRange = state.noiseRange;
      const setNoiseRange = (value: NoiseRange | ((current: NoiseRange) => NoiseRange)) =>
        set("noiseRange", value);
      const placements = state.placements;
      const setPlacements = (
        value:
          | { above: boolean; below: boolean; middle: boolean; enclosing: boolean }
          | ((current: { above: boolean; below: boolean; middle: boolean; enclosing: boolean }) => {
              above: boolean;
              below: boolean;
              middle: boolean;
              enclosing: boolean;
            }),
      ) => set("placements", value);
      const ranges = state.ranges;
      const setRanges = (
        value:
          | {
              cyrillic: boolean;
              basic: boolean;
              extended: boolean;
              supplement: boolean;
              symbols: boolean;
              unicode17: boolean;
            }
          | ((current: {
              cyrillic: boolean;
              basic: boolean;
              extended: boolean;
              supplement: boolean;
              symbols: boolean;
              unicode17: boolean;
            }) => {
              cyrillic: boolean;
              basic: boolean;
              extended: boolean;
              supplement: boolean;
              symbols: boolean;
              unicode17: boolean;
            }),
      ) => set("ranges", value);
      const cjkCompatible = state.cjkCompatible;
      const setCjkCompatible = (value: boolean | ((current: boolean) => boolean)) =>
        set("cjkCompatible", value);
      const result = state.result;
      const setResult = (
        value:
          GlitchTextResult | null | ((current: GlitchTextResult | null) => GlitchTextResult | null),
      ) => set("result", value);
      const error = state.error;
      const setError = (value: string | ((current: string) => string)) => set("error", value);
      const dirty = state.dirty;
      const setDirty = (value: boolean | ((current: boolean) => boolean)) => set("dirty", value);
      const inputGraphemes = input.length < 16_000 ? countGraphemes(input) : null;
      const resultGraphemes = result ? segmentGraphemes(result.text) : [];
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
        if (nextPreset === "eldritch") {
          setCjkCompatible(false);
          setPlacements({ above: true, below: true, middle: true, enclosing: true });
          setRanges({ ...DEFAULT_RANGES, cyrillic: true });
        }
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
        if (inputGraphemes !== null && inputGraphemes > MAX_INPUT_GRAPHEMES) {
          setResult(null);
          setError(`输入不能超过 ${MAX_INPUT_GRAPHEMES.toLocaleString("zh-CN")} 个字素。`);
          setDirty(false);
          return;
        }

        const selectedPlacements = PLACEMENT_OPTIONS.filter(({ id }) => placements[id]).map(
          ({ id }) => id,
        );
        const selectedRanges = RANGE_OPTIONS.filter(({ id }) => ranges[id]).map(({ id }) => id);
        if (!selectedPlacements.length) {
          setError("请至少选择一个符号位置。");
          return;
        }
        if (!selectedRanges.length) {
          setError("请至少选择一个 Unicode 字符范围。");
          return;
        }

        setNoiseRange(clampNoiseRange(noiseRange.min, noiseRange.max));
        run<GlitchTextResult>(
          "generate",
          {
            input,
            range: clampNoiseRange(noiseRange.min, noiseRange.max),
            placements: selectedPlacements,
            ranges: selectedRanges,
            cjkCompatible,
          },
          (generated) => {
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

            setResult(generated);
            setError("");
            setDirty(false);
          },
        );
      }
      function reset() {
        setInput("");
        setPreset("medium");
        setNoiseRange({ min: 3, max: 6 });
        setCjkCompatible(false);
        setPlacements(freshPlacements());
        setRanges(freshRanges());
        setResult(null);
        setError("");
        setDirty(false);
      }
      const statusMessage = dirty
        ? "输入或设置已更改，点击“重新生成”更新结果。"
        : result
          ? `已处理 ${result.renderableGraphemes.toLocaleString("zh-CN")} 个可见字素，添加 ${result.marksAdded.toLocaleString("zh-CN")} 个组合符，结果共 ${Array.from(result.text).length.toLocaleString("zh-CN")} 个码点${result.marksLimited ? "，已达到输出上限" : ""}。`
          : `最多输入 ${MAX_INPUT_GRAPHEMES.toLocaleString("zh-CN")} 个字素；结果只在点击生成时更新。`;

      return {
        input,
        setInput,
        preset,
        setPreset,
        noiseRange,
        setNoiseRange,
        placements,
        setPlacements,
        ranges,
        setRanges,
        cjkCompatible,
        setCjkCompatible,
        result,
        setResult,
        error,
        setError,
        dirty,
        setDirty,
        inputGraphemes,
        resultGraphemes,
        markDirty,
        changeInput,
        applyPreset,
        changeNoiseBoundary,
        changePlacement,
        changeRange,
        generate,
        reset,
        statusMessage,
        busy: state.busy,
      };
    },
    ports,
    ["input", "preset", "noiseRange", "placements", "ranges", "cjkCompatible"],
    { result: null, error: "", dirty: false, busy: false },
  );
}
