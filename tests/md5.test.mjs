import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  md5Bytes,
  md5Hex,
  verifyMd5Candidate,
  verifyMd5Digest,
} from "../app/tools/md5/md5-core.ts";

test("matches the standard MD5 test vectors", async () => {
  const vectors = [
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
  ];

  for (const [input, expected] of vectors) {
    assert.equal(await md5Hex(input), expected);
  }
});

test("hashes UTF-8 text, whitespace and block boundaries exactly", async () => {
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
    assert.equal(await md5Hex(value), expected);
  }
});

test("hashes zero-byte and arbitrary binary files exactly", async () => {
  const vectors = [
    new Uint8Array(),
    Uint8Array.from([0x00]),
    Uint8Array.from([0x00, 0xff, 0x01, 0x80, 0x7f, 0x0a]),
  ];

  for (const bytes of vectors) {
    const expected = createHash("md5").update(bytes).digest("hex");
    assert.equal(await md5Bytes(bytes), expected);
  }
});

test("does not normalize Unicode text", async () => {
  const composed = "ü";
  const decomposed = "u\u0308";

  assert.notEqual(await md5Hex(composed), await md5Hex(decomposed));
  assert.equal(
    await md5Hex(decomposed),
    createHash("md5").update(decomposed, "utf8").digest("hex"),
  );
});

test("verifies case-insensitive, trimmed MD5 input", async () => {
  assert.deepEqual(
    await verifyMd5Candidate(" 900150983CD24FB0D6963F7D28E17F72 ", "abc"),
    {
      digest: "900150983cd24fb0d6963f7d28e17f72",
      matches: true,
      error: "",
    },
  );

  assert.equal(
    (await verifyMd5Candidate("900150983cd24fb0d6963f7d28e17f72", "abd"))
      .matches,
    false,
  );
});

test("verifies precomputed binary digests", async () => {
  const bytes = Uint8Array.from([0x00, 0xff]);
  const digest = await md5Bytes(bytes);

  assert.equal(verifyMd5Digest(digest.toUpperCase(), digest).matches, true);
  assert.equal(verifyMd5Digest("0".repeat(32), digest).matches, false);
});

test("reports missing or malformed target digests", async () => {
  assert.deepEqual(await verifyMd5Candidate("", "abc"), {
    digest: "900150983cd24fb0d6963f7d28e17f72",
    matches: null,
    error: "请输入要校验的 MD5 摘要。",
  });

  const invalid = await verifyMd5Candidate("not-a-valid-md5", "abc");
  assert.equal(invalid.matches, null);
  assert.match(invalid.error, /32 位十六进制/);
});
