import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAdjacentDifference,
  formatClockTime,
  formatDuration,
  formatDurationText,
  parseTimeInput,
  sumCalculatedDifferences,
} from "../app/tools/time-diff/time-diff-core.ts";

test("parses separated and compact clock values", () => {
  assert.deepEqual(parseTimeInput("09:30", "HH:mm", false), {
    seconds: 9 * 3600 + 30 * 60,
    error: "",
  });
  assert.deepEqual(parseTimeInput("09:30:15", "HH:mm:ss", false), {
    seconds: 9 * 3600 + 30 * 60 + 15,
    error: "",
  });
  assert.deepEqual(parseTimeInput("0930", "HH:mm", true), {
    seconds: 9 * 3600 + 30 * 60,
    error: "",
  });
  assert.deepEqual(parseTimeInput("093015", "HH:mm:ss", true), {
    seconds: 9 * 3600 + 30 * 60 + 15,
    error: "",
  });
});

test("rejects malformed and out-of-range clock values", () => {
  assert.match(parseTimeInput("9:30", "HH:mm", false).error, /HH:mm/);
  assert.match(parseTimeInput("24:00", "HH:mm", false).error, /00–23/);
  assert.match(parseTimeInput("12:60", "HH:mm", false).error, /00–59/);
  assert.match(parseTimeInput("12:30:60", "HH:mm:ss", false).error, /秒/);
  assert.deepEqual(parseTimeInput("", "HH:mm", false), {
    seconds: null,
    error: "",
  });
});

test("calculates ordinary, zero, cross-midnight and blocked differences", () => {
  assert.equal(calculateAdjacentDifference(9 * 3600, 10 * 3600 + 30 * 60), 5400);
  assert.equal(calculateAdjacentDifference(9 * 3600, 9 * 3600), 0);
  assert.equal(
    calculateAdjacentDifference(23 * 3600 + 59 * 60, 60),
    120,
  );
  assert.equal(calculateAdjacentDifference(null, 60), null);
  assert.equal(calculateAdjacentDifference(60, null), null);
});

test("sums calculated adjacent differences instead of subtracting endpoints", () => {
  const differences = [
    calculateAdjacentDifference(23 * 3600, 1 * 3600),
    calculateAdjacentDifference(1 * 3600, 30 * 60),
  ];

  assert.deepEqual(differences, [2 * 3600, 23 * 3600 + 30 * 60]);
  assert.equal(sumCalculatedDifferences(differences), 25 * 3600 + 30 * 60);
  assert.equal(sumCalculatedDifferences([0, 60]), 60);
  assert.equal(sumCalculatedDifferences([60, null, 120]), null);
  assert.equal(sumCalculatedDifferences([]), null);
});

test("sums independent time pairs without linking pair boundaries", () => {
  const pairs = [
    [23 * 3600, 1 * 3600],
    [1 * 3600, 30 * 60],
  ];
  const differences = pairs.map(([start, end]) =>
    calculateAdjacentDifference(start, end),
  );

  assert.deepEqual(differences, [2 * 3600, 23 * 3600 + 30 * 60]);
  assert.equal(sumCalculatedDifferences(differences), 25 * 3600 + 30 * 60);
});

test("formats clock values and duration labels at the selected precision", () => {
  const clock = 9 * 3600 + 30 * 60 + 15;
  assert.equal(formatClockTime(clock, "HH:mm", false), "09:30");
  assert.equal(formatClockTime(clock, "HH:mm:ss", false), "09:30:15");
  assert.equal(formatClockTime(clock, "HH:mm", true), "0930");
  assert.equal(formatClockTime(clock, "HH:mm:ss", true), "093015");
  assert.equal(formatDuration(3900, "HH:mm"), "01:05");
  assert.equal(formatDuration(3930, "HH:mm:ss"), "01:05:30");
  assert.equal(formatDurationText(3900, "HH:mm"), "1 小时 5 分钟");
  assert.equal(formatDurationText(330, "HH:mm:ss"), "5 分钟 30 秒");
  assert.equal(formatDurationText(0, "HH:mm"), "0 分钟");
  assert.equal(formatDurationText(0, "HH:mm:ss"), "0 秒");
});
