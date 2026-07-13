import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_MARKS_PER_GRAPHEME,
  clampNoiseRange,
  generateGlitchText,
  generateGlitchTextResult,
  getGlitchMarks,
  segmentGraphemes,
} from "../app/tools/glitch-text/glitch-text-core.ts";

test("normalizes and caps noise ranges", () => {
  assert.deepEqual(clampNoiseRange(8, 3), { min: 3, max: 8 });
  assert.deepEqual(clampNoiseRange(-2, 99), {
    min: 0,
    max: MAX_MARKS_PER_GRAPHEME,
  });
  assert.deepEqual(clampNoiseRange(Number.NaN, undefined), { min: 0, max: 0 });
});

test("generates deterministic marks and preserves whitespace", () => {
  const output = generateGlitchText(
    "A B\nC",
    { min: 2, max: 2 },
    { placements: ["above"], ranges: ["basic"], random: () => 0 },
  );

  assert.equal(output, "A\u0300\u0300 B\u0300\u0300\nC\u0300\u0300");
});

test("keeps joined emoji as one grapheme", () => {
  const family = "👨‍👩‍👧‍👦";
  assert.deepEqual(segmentGraphemes(`${family}A`), [family, "A"]);

  const output = generateGlitchText(
    `${family}A`,
    { min: 1, max: 1 },
    { placements: ["middle"], ranges: ["basic"], random: () => 0 },
  );
  assert.equal(output, `${family}\u0334A\u0334`);
});

test("uses a CJK-compatible mark subset for Han graphemes", () => {
  const output = generateGlitchText(
    "故障",
    { min: 5, max: 5 },
    { placements: ["above", "below", "middle"], ranges: ["basic"], random: () => 0 },
  );
  assert.equal(output, "故\u0300\u0300\u0300\u0300\u0300障\u0300\u0300\u0300\u0300\u0300");

  const marks = Array.from(output).filter((character) => /\p{M}/u.test(character));
  const compatible = new Set(["\u0300", "\u0301", "\u0304", "\u0307", "\u030c"]);
  assert.equal(marks.every((mark) => compatible.has(mark)), true);
});

test("keeps invisible and multi-base marks out of ordinary pools", () => {
  const allOrdinaryMarks = ["basic", "extended", "supplement", "symbols", "unicode17"]
    .flatMap((range) => ["above", "below", "middle", "enclosing"]
      .flatMap((placement) => getGlitchMarks(range, placement)));
  const excluded = [
    0x034f,
    0x035c,
    0x035d,
    0x035e,
    0x035f,
    0x0360,
    0x0361,
    0x0362,
    0x1dcd,
    0x1dfc,
    0x1aeb,
    0x20e3,
  ].map((codePoint) => String.fromCodePoint(codePoint));

  for (const mark of excluded) assert.equal(allOrdinaryMarks.includes(mark), false);
  assert.equal(getGlitchMarks("unicode17", "above").includes("\u{1acf}"), true);
  assert.equal(getGlitchMarks("unicode17", "below").includes("\u{1add}"), true);
});

test("chooses placement before range and accepts bounded random values", () => {
  const values = [1, 1, 1, 1];
  let index = 0;
  const output = generateGlitchText(
    "X",
    { min: 1, max: 1 },
    {
      placements: ["above", "below"],
      ranges: ["basic", "symbols"],
      random: () => values[index++] ?? 1,
    },
  );

  assert.equal(output, "X\u20ef");
});

test("limits added marks without truncating the input", () => {
  const result = generateGlitchTextResult(
    "AB",
    { min: 20, max: 20 },
    {
      placements: ["above"],
      ranges: ["basic"],
      random: () => 0,
      maxOutputCodePoints: 5,
    },
  );

  assert.equal(result.text.startsWith("A"), true);
  assert.equal(result.text.includes("B"), true);
  assert.equal(result.marksAdded, 3);
  assert.equal(result.marksLimited, true);
});
