import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { md5Hex, verifyMd5Candidate } from "../app/tools/md5/md5-core.ts";

test("matches the standard MD5 test vectors", () => {
  const vectors = [
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
  ];

  for (const [input, expected] of vectors) {
    assert.equal(md5Hex(input), expected);
  }
});

test("hashes UTF-8 text, whitespace and block boundaries exactly", () => {
  const values = [
    "你好",
    "工具匣 🧰",
    "  leading and trailing  \n",
    "a".repeat(55),
    "b".repeat(56),
    "c".repeat(64),
    "d".repeat(1_000),
  ];

  for (const value of values) {
    const expected = createHash("md5").update(value, "utf8").digest("hex");
    assert.equal(md5Hex(value), expected);
  }
});

test("verifies a candidate with case-insensitive, trimmed MD5 input", () => {
  assert.deepEqual(
    verifyMd5Candidate(" 900150983CD24FB0D6963F7D28E17F72 ", "abc"),
    {
      digest: "900150983cd24fb0d6963f7d28e17f72",
      matches: true,
      error: "",
    },
  );

  assert.equal(
    verifyMd5Candidate("900150983cd24fb0d6963f7d28e17f72", "abd").matches,
    false,
  );
});

test("reports missing or malformed target digests", () => {
  assert.deepEqual(verifyMd5Candidate("", "abc"), {
    digest: "900150983cd24fb0d6963f7d28e17f72",
    matches: null,
    error: "请输入要校验的 MD5 摘要。",
  });

  const invalid = verifyMd5Candidate("not-a-valid-md5", "abc");
  assert.equal(invalid.matches, null);
  assert.match(invalid.error, /32 位十六进制/);
});
