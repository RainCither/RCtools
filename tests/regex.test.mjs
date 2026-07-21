import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REGEX_FLAGS,
  evaluateRegex,
  executeRegex,
  MAX_DISPLAYED_MATCHES,
  REGEX_FLAGS,
  replaceRegex,
  serializeRegexFlags,
} from "../app/tools/regex/regex-core.ts";
import {
  COMMON_REGEX_CATEGORIES,
  COMMON_REGEXES,
  REGEX_SYNTAX_SECTIONS,
} from "../app/tools/regex/regex-reference.ts";

test("serializes the supported flags in a stable order", () => {
  assert.equal(serializeRegexFlags(DEFAULT_REGEX_FLAGS), "g");
  assert.equal(
    serializeRegexFlags({ g: true, i: true, m: true, s: true, u: true }),
    "gimsu",
  );
});

test("finds global matches with numbered and named capture groups", () => {
  const result = executeRegex(
    "(?<key>[A-Za-z]+)=(\\d+)",
    "g",
    "width=120 height=80",
  );

  assert.equal(result.status, "success");
  assert.equal(result.truncated, false);
  assert.deepEqual(result.matches, [
    {
      index: 0,
      end: 9,
      value: "width=120",
      captures: ["width", "120"],
      namedGroups: { key: "width" },
    },
    {
      index: 10,
      end: 19,
      value: "height=80",
      captures: ["height", "80"],
      namedGroups: { key: "height" },
    },
  ]);
});

test("supports case-insensitive, multiline, dotAll and Unicode modes", () => {
  const insensitive = executeRegex("hello", "gi", "Hello hELLo");
  assert.equal(insensitive.status, "success");
  assert.equal(insensitive.matches.length, 2);

  const multiline = executeRegex("^item", "gm", "item\nskip\nitem");
  assert.equal(multiline.status, "success");
  assert.deepEqual(multiline.matches.map((match) => match.index), [0, 10]);

  const dotAll = executeRegex("a.b", "s", "a\nb");
  assert.equal(dotAll.status, "success");
  assert.equal(dotAll.matches[0]?.value, "a\nb");

  const unicode = executeRegex("\\p{Emoji}", "gu", "😀A");
  assert.equal(unicode.status, "success");
  assert.deepEqual(
    unicode.matches.map(({ index, end, value }) => ({ index, end, value })),
    [{ index: 0, end: 2, value: "😀" }],
  );
});

test("stops after the first match when the global flag is disabled", () => {
  const result = executeRegex("cat", "", "cat cat");
  assert.equal(result.status, "success");
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0]?.index, 0);
});

test("treats an empty pattern as idle and reports invalid syntax", () => {
  assert.deepEqual(executeRegex("", "g", "text"), {
    status: "idle",
    matches: [],
    truncated: false,
  });

  const invalid = executeRegex("(", "g", "text");
  assert.equal(invalid.status, "error");
  assert.match(invalid.error, /正则表达式无效/);
  assert.deepEqual(invalid.matches, []);
});

test("advances safely after global zero-length matches", () => {
  const ascii = executeRegex("(?=.)", "g", "abc");
  assert.equal(ascii.status, "success");
  assert.deepEqual(ascii.matches.map((match) => match.index), [0, 1, 2]);
  assert.deepEqual(ascii.matches.map((match) => match.value), ["", "", ""]);

  const unicode = executeRegex("(?=.)", "gu", "😀x");
  assert.equal(unicode.status, "success");
  assert.deepEqual(unicode.matches.map((match) => match.index), [0, 2]);
});

test("uses native JavaScript replacement tokens and supports deletion", () => {
  assert.equal(
    replaceRegex(
      "(?<word>\\w+)=(\\d+)",
      "g",
      "x=1 y=2",
      "$<word>[$2]",
    ),
    "x[1] y[2]",
  );
  assert.equal(replaceRegex("(a)", "g", "a", "$$-$&-$1"), "$-a-a");
  assert.equal(replaceRegex("b", "", "abc", "<$`|$&|$'>"), "a<a|b|c>c");
  assert.equal(replaceRegex("\\s+", "g", "a b  c", ""), "abc");
});

test("returns matches and replacement text from one evaluation", () => {
  const result = evaluateRegex("(\\d+)", "g", "A1 B22", "[$1]");
  assert.equal(result.status, "success");
  assert.equal(result.replacedText, "A[1] B[22]");
  assert.deepEqual(result.matches.map((match) => match.value), ["1", "22"]);

  const invalid = evaluateRegex("[", "g", "text", "value");
  assert.equal(invalid.status, "error");
  assert.deepEqual(invalid.matches, []);
});

test("caps displayed matches and reports truncation", () => {
  const result = executeRegex(
    "x",
    "g",
    "x".repeat(MAX_DISPLAYED_MATCHES + 25),
  );

  assert.equal(result.status, "success");
  assert.equal(result.matches.length, MAX_DISPLAYED_MATCHES);
  assert.equal(result.truncated, true);
});

test("keeps syntax reference entries and common presets uniquely addressable", () => {
  const syntaxEntries = REGEX_SYNTAX_SECTIONS.flatMap((section) => section.entries);
  assert.equal(new Set(REGEX_SYNTAX_SECTIONS.map((section) => section.id)).size, REGEX_SYNTAX_SECTIONS.length);
  assert.equal(new Set(syntaxEntries.map((entry) => entry.id)).size, syntaxEntries.length);

  assert.equal(COMMON_REGEXES.length, 24);
  assert.equal(new Set(COMMON_REGEXES.map((entry) => entry.id)).size, COMMON_REGEXES.length);
  assert.deepEqual(
    COMMON_REGEX_CATEGORIES.map((category) => category.id),
    ["text", "number", "network", "datetime", "development"],
  );
  assert.deepEqual(
    COMMON_REGEX_CATEGORIES.map(
      (category) => COMMON_REGEXES.filter((entry) => entry.category === category.id).length,
    ),
    [5, 5, 6, 4, 4],
  );
});

test("compiles every common preset and verifies its positive and negative examples", () => {
  const supportedFlags = new Set(REGEX_FLAGS);

  for (const entry of COMMON_REGEXES) {
    for (const flag of entry.flags) {
      assert.equal(supportedFlags.has(flag), true, `${entry.id} uses unsupported flag ${flag}`);
    }

    const flags = entry.flags.join("");
    assert.equal(
      new RegExp(entry.pattern, flags).test(entry.positiveExample),
      true,
      `${entry.id} should match its positive example`,
    );
    assert.equal(
      new RegExp(entry.pattern, flags).test(entry.negativeExample),
      false,
      `${entry.id} should reject its negative example`,
    );
  }
});
