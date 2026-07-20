import assert from "node:assert/strict";
import test from "node:test";
import {
  convertFloatInput,
  decodeFloatPattern,
  encodeFloatValue,
} from "../app/tools/ieee-754/ieee-754-core.ts";

test("encodes 0.1 with the expected Float32 and Float64 rounding", () => {
  const float32 = encodeFloatValue("0.1", "float32").data;
  assert.equal(float32?.hex, "3DCCCCCD");
  assert.equal(float32?.storedValue, "0.10000000149011612");
  assert.equal(float32?.binary, "00111101110011001100110011001101");
  assert.equal(float32?.signBit, "0");
  assert.equal(float32?.exponentBits, "01111011");
  assert.equal(float32?.fractionBits, "10011001100110011001101");
  assert.equal(float32?.bigEndianBytes, "3D CC CC CD");
  assert.equal(float32?.littleEndianBytes, "CD CC CC 3D");

  const float64 = encodeFloatValue("0.1", "float64").data;
  assert.equal(float64?.hex, "3FB999999999999A");
  assert.equal(float64?.storedValue, "0.1");
  assert.equal(float64?.classification, "normal");
});

test("preserves positive and negative zero", () => {
  const positive32 = encodeFloatValue("0", "float32").data;
  const negative32 = encodeFloatValue("-0", "float32").data;
  const negative64 = encodeFloatValue("-0", "float64").data;

  assert.equal(positive32?.hex, "00000000");
  assert.equal(positive32?.storedValue, "0");
  assert.equal(positive32?.classification, "zero");
  assert.equal(negative32?.hex, "80000000");
  assert.equal(negative32?.storedValue, "-0");
  assert.equal(negative32?.signBit, "1");
  assert.equal(negative64?.hex, "8000000000000000");
  assert.equal(negative64?.storedValue, "-0");
});

test("encodes normal values, infinities and deterministic quiet NaNs", () => {
  assert.equal(encodeFloatValue("1.5", "float32").data?.hex, "3FC00000");
  assert.equal(encodeFloatValue("1.5e0", "float64").data?.hex, "3FF8000000000000");
  assert.equal(encodeFloatValue("Infinity", "float32").data?.hex, "7F800000");
  assert.equal(encodeFloatValue("-Infinity", "float64").data?.hex, "FFF0000000000000");

  const nan32 = encodeFloatValue("NaN", "float32").data;
  const nan64 = encodeFloatValue("NaN", "float64").data;
  assert.equal(nan32?.hex, "7FC00000");
  assert.equal(nan64?.hex, "7FF8000000000000");
  assert.equal(nan32?.classification, "nan");
  assert.equal(nan64?.storedValue, "NaN");
});

test("decodes hexadecimal and binary patterns without changing their bits", () => {
  const hex = decodeFloatPattern("0x3F800000", "float32").data;
  assert.equal(hex?.storedValue, "1");
  assert.equal(hex?.classification, "normal");
  assert.equal(hex?.signBit, "0");
  assert.equal(hex?.exponentBits, "01111111");
  assert.equal(hex?.fractionBits, "00000000000000000000000");

  const binary = decodeFloatPattern(
    "0b00111111 10000000_00000000 00000000",
    "float32",
  ).data;
  assert.equal(binary?.hex, "3F800000");
  assert.equal(binary?.storedValue, "1");
});

test("classifies subnormals and preserves arbitrary NaN payloads", () => {
  const subnormal32 = decodeFloatPattern("00000001", "float32").data;
  assert.equal(subnormal32?.classification, "subnormal");
  assert.equal(subnormal32?.storedValue, "1.401298464324817e-45");

  const subnormal64 = decodeFloatPattern("0000000000000001", "float64").data;
  assert.equal(subnormal64?.classification, "subnormal");
  assert.equal(subnormal64?.storedValue, "5e-324");

  const payload = decodeFloatPattern("7FC12345", "float32").data;
  assert.equal(payload?.classification, "nan");
  assert.equal(payload?.hex, "7FC12345");
  assert.equal(payload?.fractionBits, "10000010010001101000101");
});

test("uses the selected format for overflow, underflow and revalidation", () => {
  assert.equal(encodeFloatValue("3.5e38", "float32").data?.classification, "infinity");
  assert.equal(encodeFloatValue("1e-50", "float32").data?.classification, "zero");
  assert.equal(encodeFloatValue("3.5e38", "float64").data?.classification, "normal");

  assert.equal(convertFloatInput("3F800000", "float32", "bits").data?.storedValue, "1");
  assert.match(convertFloatInput("3F800000", "float64", "bits").error, /Float64/);
});

test("rejects malformed numbers and bit patterns", () => {
  const badNumbers = ["1_000", "0x1", "1 2", ".", "1e", "+NaN"];
  for (const input of badNumbers) {
    const result = encodeFloatValue(input, "float32");
    assert.equal(result.data, null, `${input} should be rejected`);
    assert.notEqual(result.error, "");
  }

  const badPatterns = [
    "1010",
    "3F80000",
    "0b0012",
    "0x3F80ZZZZ",
    "0o17740000000",
    "0x",
  ];
  for (const input of badPatterns) {
    const result = decodeFloatPattern(input, "float32");
    assert.equal(result.data, null, `${input} should be rejected`);
    assert.notEqual(result.error, "");
  }
});

test("keeps empty input in the neutral waiting state", () => {
  assert.deepEqual(convertFloatInput("   ", "float32", "number"), {
    data: null,
    error: "",
  });
  assert.deepEqual(convertFloatInput("\n\t", "float64", "bits"), {
    data: null,
    error: "",
  });
});
