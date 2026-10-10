/** @file 按字素为可见字符追加 Unicode 组合符，生成受限且可复现的故障文字。 */
/** 每个可见字素随机追加组合符的最小值与最大值。 */
export interface NoiseRange {
  min: number;
  max: number;
}

/** 组合符相对基础字素的视觉位置。 */
export type GlitchMarkPlacement = "above" | "below" | "middle" | "enclosing";
/** 可供选择的 Unicode 组合符分区。 */
export type GlitchMarkRange =
  "cyrillic" | "basic" | "extended" | "supplement" | "symbols" | "unicode17";

/** 故障文字生成器可覆盖的字符池、随机源和输出上限。 */
export interface GenerateGlitchTextOptions {
  cjkCompatible?: boolean;
  placements?: readonly GlitchMarkPlacement[];
  ranges?: readonly GlitchMarkRange[];
  random: () => number;
  maxOutputCodePoints?: number;
}

/** 生成文本及本次处理的字素和组合符统计。 */
export interface GlitchTextResult {
  text: string;
  inputGraphemes: number;
  renderableGraphemes: number;
  marksAdded: number;
  marksLimited: boolean;
}

/** 单次允许处理的最大输入字素数。 */
export const MAX_INPUT_GRAPHEMES = 2_000;
/** 单个可见字素允许追加的最大组合符数。 */
export const MAX_MARKS_PER_GRAPHEME = 60;
/** 生成结果允许包含的最大 Unicode 码点数。 */
export const MAX_OUTPUT_CODE_POINTS = 30_000;

/** 默认启用的组合符位置。 */
export const DEFAULT_GLITCH_MARK_PLACEMENTS: GlitchMarkPlacement[] = ["above", "below", "middle"];
/** 默认启用、兼容性最好的 Unicode 范围。 */
export const DEFAULT_GLITCH_MARK_RANGES: GlitchMarkRange[] = ["basic"];

const ALL_PLACEMENTS: readonly GlitchMarkPlacement[] = ["above", "below", "middle", "enclosing"];
const ALL_RANGES: readonly GlitchMarkRange[] = [
  "basic",
  "cyrillic",
  "extended",
  "supplement",
  "symbols",
  "unicode17",
];

/** 创建包含首尾码点的连续字符数组。 */
function createCodePointRange(min: number, max: number): string[] {
  return Array.from({ length: max - min + 1 }, (_, index) => String.fromCodePoint(min + index));
}

/** 合并多段码点区间，构造可随机抽取的组合符池。 */
function createMarkPool(ranges: ReadonlyArray<readonly [number, number]>): string[] {
  return ranges.flatMap(([min, max]) => createCodePointRange(min, max));
}

const EMPTY_MARKS: readonly string[] = [];

const COMBINING_MARKS_BY_RANGE: Record<
  GlitchMarkRange,
  Record<GlitchMarkPlacement, readonly string[]>
> = {
  cyrillic: {
    above: EMPTY_MARKS,
    below: EMPTY_MARKS,
    middle: EMPTY_MARKS,
    enclosing: createMarkPool([[0x0488, 0x0489]]),
  },
  basic: {
    above: createMarkPool([
      [0x0300, 0x0315],
      [0x031a, 0x031b],
      [0x033d, 0x033f],
      [0x0346, 0x0346],
      [0x034a, 0x034c],
      [0x0350, 0x0352],
      [0x0357, 0x0358],
      [0x035b, 0x035b],
    ]),
    below: createMarkPool([
      [0x0316, 0x0319],
      [0x031c, 0x0333],
      [0x0339, 0x033c],
      [0x0347, 0x0349],
      [0x034d, 0x034e],
      [0x0353, 0x0356],
      [0x0359, 0x035a],
    ]),
    middle: createMarkPool([[0x0334, 0x0338]]),
    enclosing: EMPTY_MARKS,
  },
  extended: {
    above: createMarkPool([
      [0x1ab0, 0x1ab4],
      [0x1abb, 0x1abc],
      [0x1ac1, 0x1ac2],
      [0x1ac5, 0x1ac9],
      [0x1acb, 0x1ace],
    ]),
    below: createMarkPool([
      [0x1ab5, 0x1aba],
      [0x1abd, 0x1abd],
      [0x1abf, 0x1ac0],
      [0x1ac3, 0x1ac4],
      [0x1aca, 0x1aca],
    ]),
    middle: createMarkPool([[0x1abe, 0x1abe]]),
    enclosing: EMPTY_MARKS,
  },
  supplement: {
    above: createMarkPool([
      [0x1dc0, 0x1dc1],
      [0x1dc3, 0x1dc9],
      [0x1dcb, 0x1dcc],
      [0x1dce, 0x1dce],
      [0x1dd1, 0x1df8],
      [0x1dfb, 0x1dfb],
      [0x1dfe, 0x1dfe],
    ]),
    below: createMarkPool([
      [0x1dc2, 0x1dc2],
      [0x1dca, 0x1dca],
      [0x1dcf, 0x1dd0],
      [0x1df9, 0x1dfa],
      [0x1dfd, 0x1dfd],
      [0x1dff, 0x1dff],
    ]),
    middle: EMPTY_MARKS,
    enclosing: EMPTY_MARKS,
  },
  symbols: {
    above: createMarkPool([
      [0x20d0, 0x20d1],
      [0x20d4, 0x20d7],
      [0x20db, 0x20dc],
      [0x20e1, 0x20e1],
      [0x20e7, 0x20e7],
      [0x20e9, 0x20e9],
      [0x20f0, 0x20f0],
    ]),
    below: createMarkPool([
      [0x20e8, 0x20e8],
      [0x20ec, 0x20ef],
    ]),
    middle: createMarkPool([
      [0x20d2, 0x20d3],
      [0x20d8, 0x20da],
      [0x20e5, 0x20e6],
      [0x20ea, 0x20eb],
    ]),
    enclosing: createMarkPool([
      [0x20dd, 0x20e0],
      [0x20e2, 0x20e2],
      [0x20e4, 0x20e4],
    ]),
  },
  unicode17: {
    above: createMarkPool([
      [0x1acf, 0x1adc],
      [0x1ae0, 0x1ae5],
      [0x1ae7, 0x1aea],
    ]),
    below: createMarkPool([
      [0x1add, 0x1add],
      [0x1ae6, 0x1ae6],
    ]),
    middle: EMPTY_MARKS,
    enclosing: EMPTY_MARKS,
  },
};

const CJK_COMBINING_MARKS_BY_RANGE: Record<
  GlitchMarkRange,
  Record<GlitchMarkPlacement, readonly string[]>
> = {
  cyrillic: {
    above: EMPTY_MARKS,
    below: EMPTY_MARKS,
    middle: EMPTY_MARKS,
    enclosing: createMarkPool([[0x0488, 0x0489]]),
  },
  basic: {
    above: [0x0300, 0x0301, 0x0304, 0x0307, 0x030c].map((codePoint) =>
      String.fromCodePoint(codePoint),
    ),
    below: EMPTY_MARKS,
    middle: EMPTY_MARKS,
    enclosing: EMPTY_MARKS,
  },
  extended: {
    above: EMPTY_MARKS,
    below: EMPTY_MARKS,
    middle: EMPTY_MARKS,
    enclosing: EMPTY_MARKS,
  },
  supplement: {
    above: EMPTY_MARKS,
    below: EMPTY_MARKS,
    middle: EMPTY_MARKS,
    enclosing: EMPTY_MARKS,
  },
  symbols: {
    above: EMPTY_MARKS,
    below: EMPTY_MARKS,
    middle: EMPTY_MARKS,
    enclosing: [0x20dd, 0x20de].map((codePoint) => String.fromCodePoint(codePoint)),
  },
  unicode17: {
    above: EMPTY_MARKS,
    below: EMPTY_MARKS,
    middle: EMPTY_MARKS,
    enclosing: EMPTY_MARKS,
  },
};

const graphemeSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** 按 Unicode 字素边界拆分文本；旧环境退化为码点拆分。 */
export function segmentGraphemes(input: string): string[] {
  if (!graphemeSegmenter) return Array.from(input);
  return Array.from(graphemeSegmenter.segment(input), ({ segment }) => segment);
}

/** 统计用户感知的字素数量。 */
export function countGraphemes(input: string): number {
  return segmentGraphemes(input).length;
}

/** 将单字素组合符数量收敛到安全整数范围。 */
function normalizeNoiseCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(MAX_MARKS_PER_GRAPHEME, Math.max(0, Math.trunc(value)));
}

/** 规范化噪声上下界，并在顺序颠倒时自动交换。 */
export function clampNoiseRange(
  min: number | null | undefined,
  max: number | null | undefined,
): NoiseRange {
  const normalizedMin = normalizeNoiseCount(min);
  const normalizedMax = normalizeNoiseCount(max);

  return normalizedMin > normalizedMax
    ? { min: normalizedMax, max: normalizedMin }
    : { min: normalizedMin, max: normalizedMax };
}

/** 判断字素是否是适合附加组合符的可见基础字符。 */
export function isRenderableGrapheme(grapheme: string): boolean {
  return grapheme.length > 0 && !/^\s+$/u.test(grapheme) && !/^[\p{M}\p{Cf}]+$/u.test(grapheme);
}

/** 判断字素是否包含中日韩文字，以选择更安全的组合符子集。 */
export function isCjkGrapheme(grapheme: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(grapheme);
}

/** 读取指定 Unicode 范围与位置的标准组合符池。 */
export function getGlitchMarks(
  range: GlitchMarkRange,
  placement: GlitchMarkPlacement,
): readonly string[] {
  return COMBINING_MARKS_BY_RANGE[range]?.[placement] ?? EMPTY_MARKS;
}

/** 去重输入并丢弃不在允许集合中的选项。 */
function uniqueKnownValues<T extends string>(values: readonly T[], knownValues: readonly T[]): T[] {
  const known = new Set(knownValues);
  return [...new Set(values)].filter((value) => known.has(value));
}

/** 将任意随机源结果规范到可安全索引的 [0, 1) 区间。 */
function normalizeRandomValue(random: () => number): number {
  const value = random();
  if (!Number.isFinite(value)) return 0;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
}

/** 通过注入的随机源生成数组索引。 */
function randomIndex(length: number, random: () => number): number {
  return Math.floor(normalizeRandomValue(random) * length);
}

/** 生成包含上下界的随机整数。 */
function randomInt(min: number, max: number, random: () => number): number {
  return min + randomIndex(max - min + 1, random);
}

type PlacementSource = {
  placement: GlitchMarkPlacement;
  rangePools: readonly (readonly string[])[];
};

/** 为每个启用位置收集非空的 Unicode 范围字符池。 */
function createPlacementSources(
  placements: readonly GlitchMarkPlacement[],
  ranges: readonly GlitchMarkRange[],
  marksByRange = COMBINING_MARKS_BY_RANGE,
): PlacementSource[] {
  return placements.flatMap((placement) => {
    const rangePools = ranges
      .map((range) => marksByRange[range]?.[placement] ?? EMPTY_MARKS)
      .filter((marks) => marks.length > 0);
    return rangePools.length > 0 ? [{ placement, rangePools }] : [];
  });
}

/** 从位置、范围和字符三级池中随机选择一个组合符。 */
function pickCombiningMark(sources: readonly PlacementSource[], random: () => number): string {
  const source = sources[randomIndex(sources.length, random)];
  if (!source) throw new Error("所选位置与字符范围没有可用组合。");
  const pool = source.rangePools[randomIndex(source.rangePools.length, random)];
  if (!pool) throw new Error("所选位置与字符范围没有可用组合。");
  const mark = pool[randomIndex(pool.length, random)];
  if (mark === undefined) throw new Error("所选位置与字符范围没有可用组合。");
  return mark;
}

/** 生成故障文字及字素、组合符和输出限制统计。 */
export function generateGlitchTextResult(
  input: string,
  range: NoiseRange,
  options: GenerateGlitchTextOptions,
): GlitchTextResult {
  const graphemes = segmentGraphemes(input);
  const normalizedRange = clampNoiseRange(range.min, range.max);
  const random = options.random;
  const placements = uniqueKnownValues(
    options.placements ?? DEFAULT_GLITCH_MARK_PLACEMENTS,
    ALL_PLACEMENTS,
  );
  const ranges = uniqueKnownValues(options.ranges ?? DEFAULT_GLITCH_MARK_RANGES, ALL_RANGES);
  const standardSources = createPlacementSources(placements, ranges);
  const cjkSources = createPlacementSources(placements, ranges, CJK_COMBINING_MARKS_BY_RANGE);
  const maxOutputCodePoints = Math.max(
    0,
    Math.trunc(options.maxOutputCodePoints ?? MAX_OUTPUT_CODE_POINTS),
  );
  const inputCodePoints = Array.from(input).length;
  // 先为原文保留码点预算，再限制附加符号数量，确保输出上限不会裁掉输入文字。
  let remainingMarkBudget = Math.max(0, maxOutputCodePoints - inputCodePoints);
  let renderableGraphemes = 0;
  let marksAdded = 0;
  let marksLimited = false;
  const output: string[] = [];

  for (const grapheme of graphemes) {
    output.push(grapheme);
    if (!isRenderableGrapheme(grapheme)) continue;
    renderableGraphemes += 1;

    const sources = options.cjkCompatible && isCjkGrapheme(grapheme) ? cjkSources : standardSources;
    if (sources.length === 0) continue;
    const requestedCount = randomInt(normalizedRange.min, normalizedRange.max, random);
    const count = Math.min(requestedCount, remainingMarkBudget);
    if (count < requestedCount) marksLimited = true;

    for (let index = 0; index < count; index += 1) {
      output.push(pickCombiningMark(sources, random));
    }
    marksAdded += count;
    remainingMarkBudget -= count;
  }

  return {
    text: output.join(""),
    inputGraphemes: graphemes.length,
    renderableGraphemes,
    marksAdded,
    marksLimited,
  };
}

/** 只返回生成后的故障文字，供无需统计的调用方使用。 */
export function generateGlitchText(
  input: string,
  range: NoiseRange,
  options: GenerateGlitchTextOptions,
): string {
  return generateGlitchTextResult(input, range, options).text;
}
