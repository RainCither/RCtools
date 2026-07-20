import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMON_BASES,
  convertBaseInteger,
} from "../app/tools/base-converter/base-converter-core.ts";

test("converts a decimal integer to every common base", () => {
  assert.deepEqual(convertBaseInteger("255", 10), {
    value: 255n,
    outputs: {
      2: "11111111",
      8: "377",
      10: "255",
      16: "FF",
    },
    error: "",
  });
});

test("accepts signs, matching prefixes and case-insensitive hex digits", () => {
  assert.equal(convertBaseInteger("  +0b1010  ", 2).value, 10n);
  assert.equal(convertBaseInteger("-0O17", 8).value, -15n);
  assert.equal(convertBaseInteger("0xdeadBEEF", 16).value, 3735928559n);
  assert.deepEqual(convertBaseInteger("-ff", 16).outputs, {
    2: "-11111111",
    8: "-377",
    10: "-255",
    16: "-FF",
  });
});

test("normalizes zero and leading zeros", () => {
  for (const base of COMMON_BASES) {
    assert.deepEqual(convertBaseInteger("-000", base).outputs, {
      2: "0",
      8: "0",
      10: "0",
      16: "0",
    });
  }
});

test("keeps integers beyond Number safe range exact", () => {
  const decimal = "900719925474099312345678901234567890";
  const value = BigInt(decimal);
  const result = convertBaseInteger(decimal, 10);

  assert.equal(result.value, value);
  assert.equal(result.outputs?.[2], value.toString(2));
  assert.equal(result.outputs?.[8], value.toString(8));
  assert.equal(result.outputs?.[10], decimal);
  assert.equal(result.outputs?.[16], value.toString(16).toUpperCase());
});

test("rejects invalid digits, notation and conflicting prefixes", () => {
  const invalidInputs = [
    ["102", 2],
    ["89", 8],
    ["1_000", 10],
    ["1.5", 10],
    ["1e3", 10],
    ["12 3", 10],
    ["0xFF", 10],
    ["0b10", 16],
  ];

  for (const [input, base] of invalidInputs) {
    const result = convertBaseInteger(input, base);
    assert.equal(result.value, null, `${input} should be invalid for base ${base}`);
    assert.equal(result.outputs, null);
    assert.notEqual(result.error, "");
  }
});

test("handles empty, sign-only and prefix-only input states", () => {
  assert.deepEqual(convertBaseInteger("   ", 10), {
    value: null,
    outputs: null,
    error: "",
  });
  assert.match(convertBaseInteger("-", 10).error, /正负号/);
  assert.match(convertBaseInteger("0x", 16).error, /前缀后/);
});
