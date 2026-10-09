import { describe, expect, it } from "vitest";
import { convertBaseInteger } from "../../src/tools/base-converter/core";
import { decodeBase64, encodeBase64 } from "../../src/tools/base64/core";
import { hexToRgb, normalizeHex, rgbToHsl } from "../../src/tools/color/core";
import { formatCss, minifyCss } from "../../src/tools/css-formatter/core";
import { countGraphemes, generateGlitchTextResult } from "../../src/tools/glitch-text/core";
import { formatHtml, minifyHtml } from "../../src/tools/html-formatter/core";
import { convertFloatInput } from "../../src/tools/ieee-754/core";
import { formatJavaScript, minifyJavaScript } from "../../src/tools/js-formatter/core";
import { formatJson, minifyJson } from "../../src/tools/json/core";
import { md5Bytes, md5Hex, verifyMd5Digest } from "../../src/tools/md5/core";
import { generatePassword } from "../../src/tools/password/core";
import { evaluateRegex } from "../../src/tools/regex/core";
import { shaHex, verifyShaDigest } from "../../src/tools/sha/core";
import { MAX_HASH_FILE_BYTES, validateHashFile } from "../../src/contracts/files";
import { countText } from "../../src/tools/text-stats/core";
import {
  calculateAdjacentDifference,
  formatDuration,
  parseTimeInput,
} from "../../src/tools/time-diff/core";
import { convertTimestamp } from "../../src/tools/timestamp/core";
describe("preserved tool semantics", () => {
  it("handles empty inputs and expected validation across all utility types", async () => {
    expect(countText("")).toEqual({ characters: 0, noSpaces: 0, words: 0, lines: 0 });
    expect(encodeBase64("")).toBe("");
    expect(decodeBase64("")).toBe("");
    expect(() => decodeBase64("%%")).toThrow();
    expect(normalizeHex("bad-color")).toBeNull();
    expect(parseTimeInput("24:00", "HH:mm", false).error).toBeTruthy();
    expect(parseTimeInput("", "HH:mm", false).seconds).toBeNull();
    expect(() =>
      generatePassword(
        18,
        { lower: false, upper: false, number: false, symbol: false },
        { index: () => 0 },
      ),
    ).toThrow();
    expect(() => convertTimestamp("")).toThrow();
    expect(convertFloatInput("", "float32", "number").data).toBeNull();
    expect(convertFloatInput("invalid", "float32", "bits").error).toBeTruthy();
    await expect(formatCss("")).rejects.toThrow();
    await expect(formatJavaScript("")).rejects.toThrow();
    await expect(formatHtml("")).rejects.toThrow();
    expect(generateGlitchTextResult("", { min: 1, max: 1 }, { random: () => 0 }).text).toBe("");
    expect(evaluateRegex("", "g", "", "").status).toBe("idle");
  });
  it("enforces regex display and file size limits and validates hash targets", () => {
    const evaluated = evaluateRegex("a", "g", "a".repeat(501), "");
    expect(evaluated.status).toBe("success");
    if (evaluated.status === "success") {
      expect(evaluated.matches).toHaveLength(500);
      expect(evaluated.truncated).toBe(true);
    }
    expect(validateHashFile({ size: MAX_HASH_FILE_BYTES })).toBe("");
    expect(validateHashFile({ size: MAX_HASH_FILE_BYTES + 1 })).toContain("20 MiB");
    expect(verifyMd5Digest("", "x").error).toBeTruthy();
    expect(verifyMd5Digest("not-a-digest", "x").matches).toBeNull();
    expect(verifyShaDigest("short", "x", "SHA-256").error).toBeTruthy();
  });
  it("formats JSON without changing large numbers or duplicate keys", () => {
    const input = '{"a":9007199254740993,"a":1.2300,"s":"\\u4e2d"}';
    expect(minifyJson(formatJson(input))).toBe(input);
    expect(formatJson("{}")).toBe("{}");
    expect(() => formatJson("{bad")).toThrow();
  });
  it("converts signed integers with exact BigInt precision", () => {
    expect(convertBaseInteger("-0xFFFFFFFFFFFFFFFF", 16).outputs?.[10]).toBe(
      "-18446744073709551615",
    );
    expect(convertBaseInteger("0xFF", 10).error).toBeTruthy();
    expect(convertBaseInteger("", 10).outputs).toBeNull();
  });
  it("preserves IEEE-754 negative zero and infinity", () => {
    expect(convertFloatInput("-0", "float32", "number").data?.hex).toBe("80000000");
    expect(convertFloatInput("Infinity", "float64", "number").data?.classification).toBe(
      "infinity",
    );
    expect(convertFloatInput("3F800000", "float32", "bits").data?.storedValue).toBe("1");
  });
  it("handles Unicode graphemes and bounded glitch output", () => {
    expect(countGraphemes("👨‍👩‍👧‍👦")).toBe(1);
    const result = generateGlitchTextResult("中文", { min: 3, max: 3 }, { random: () => 0.5 });
    expect(result.marksAdded).toBe(6);
    expect(result.text).toContain("中");
  });
  it("advances zero-width regex matches and expands replacement groups", () => {
    const result = evaluateRegex("(?=a)", "g", "aa", "X");
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.matches).toHaveLength(2);
      expect(result.replacedText).toBe("XaXa");
    }
    expect(evaluateRegex("[", "g", "x", "").status).toBe("error");
  });
  it("hashes bytes and preserves whitespace", async () => {
    expect(await md5Hex("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(await md5Hex(" 中文 ")).not.toBe(await md5Hex("中文"));
    expect(await md5Bytes(new Uint8Array([97, 98, 99]))).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(await shaHex("abc", "SHA-256")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("formats and conservatively minifies HTML including embedded resources", async () => {
    expect(await formatHtml("<div>中文</div>")).toContain("中文");
    const result = await minifyHtml("<div>a  b</div><!-- remove --><pre> x  y </pre>");
    expect(result).toContain("a  b");
    expect(result).toContain(" x  y ");
    expect(result).not.toContain("remove");
  });
  it("keeps JavaScript names when requested and validates CSS", async () => {
    expect(await formatJavaScript("const x=1")).toContain("const x = 1");
    expect(
      await minifyJavaScript("function named(value){return value+1}named(2)", "preserve-names"),
    ).toContain("named");
    expect(await formatCss("a{color:red}")).toContain("color: red");
    expect(await minifyCss("a { color: red; }")).toBe("a{color:red}");
  });
  it("converts UTF-8 Base64 and reports text counts", () => {
    expect(decodeBase64(encodeBase64("中文🙂"))).toBe("中文🙂");
    expect(countText("中文\nword")).toEqual({ characters: 7, noSpaces: 6, words: 3, lines: 2 });
  });
  it("keeps timestamp, secure password and color behavior", () => {
    expect(convertTimestamp("1720584000").seconds).toBe("1720584000");
    expect(() => convertTimestamp("123")).toThrow();
    const password = generatePassword(
      18,
      { lower: true, upper: true, number: true, symbol: true },
      { index: (max) => max - 1 },
    );
    expect(password).toHaveLength(18);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[2-9]/);
    expect(password).toMatch(/[!@#$%^&*+\-_=]/);
    expect(normalizeHex("abc")).toBe("#AABBCC");
    expect(rgbToHsl(...(Object.values(hexToRgb("#FF0000")) as [number, number, number]))).toEqual({
      h: 0,
      s: 100,
      l: 50,
    });
  });
  it("computes continuous time differences across midnight", () => {
    expect(parseTimeInput("23:59", "HH:mm", false).seconds).toBe(86340);
    expect(formatDuration(calculateAdjacentDifference(86340, 60) ?? 0, "HH:mm")).toBe("00:02");
  });
});
