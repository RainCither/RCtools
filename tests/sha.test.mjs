import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  SHA_ALGORITHMS,
  SHA_DIGEST_LENGTHS,
  shaBytes,
  shaHex,
  verifyShaCandidate,
  verifyShaDigest,
} from "../app/tools/sha/sha-core.ts";

const NODE_ALGORITHM_NAMES = {
  "SHA-1": "sha1",
  "SHA-256": "sha256",
  "SHA-512": "sha512",
};

test("supports exactly SHA-1, SHA-256 and SHA-512", () => {
  assert.deepEqual(SHA_ALGORITHMS, ["SHA-1", "SHA-256", "SHA-512"]);
  assert.deepEqual(SHA_DIGEST_LENGTHS, {
    "SHA-1": 40,
    "SHA-256": 64,
    "SHA-512": 128,
  });
});

test("matches standard SHA test vectors", async () => {
  const vectors = ["", "abc"];

  for (const algorithm of SHA_ALGORITHMS) {
    for (const input of vectors) {
      const expected = createHash(NODE_ALGORITHM_NAMES[algorithm])
        .update(input, "utf8")
        .digest("hex");
      assert.equal(await shaHex(input, algorithm), expected);
    }
  }
});

test("hashes UTF-8 text and whitespace exactly", async () => {
  const values = [
    "你好",
    "工具匣 🧰",
    "  leading and trailing  \n",
    "a".repeat(1_000),
  ];

  for (const algorithm of SHA_ALGORITHMS) {
    for (const value of values) {
      const expected = createHash(NODE_ALGORITHM_NAMES[algorithm])
        .update(value, "utf8")
        .digest("hex");
      assert.equal(await shaHex(value, algorithm), expected);
    }
  }
});

test("hashes zero-byte and arbitrary binary files exactly", async () => {
  const vectors = [
    new Uint8Array(),
    Uint8Array.from([0x00]),
    Uint8Array.from([0x00, 0xff, 0x01, 0x80, 0x7f, 0x0a]),
  ];

  for (const algorithm of SHA_ALGORITHMS) {
    for (const bytes of vectors) {
      const expected = createHash(NODE_ALGORITHM_NAMES[algorithm])
        .update(bytes)
        .digest("hex");
      assert.equal(await shaBytes(bytes, algorithm), expected);
    }
  }
});

test("does not normalize Unicode text", async () => {
  const composed = "ü";
  const decomposed = "u\u0308";

  for (const algorithm of SHA_ALGORITHMS) {
    assert.notEqual(
      await shaHex(composed, algorithm),
      await shaHex(decomposed, algorithm),
    );
    assert.equal(
      await shaHex(decomposed, algorithm),
      createHash(NODE_ALGORITHM_NAMES[algorithm])
        .update(decomposed, "utf8")
        .digest("hex"),
    );
  }
});

test("verifies trimmed, case-insensitive SHA digests", async () => {
  for (const algorithm of SHA_ALGORITHMS) {
    const expected = createHash(NODE_ALGORITHM_NAMES[algorithm])
      .update("abc", "utf8")
      .digest("hex");
    const matching = await verifyShaCandidate(
      ` ${expected.toUpperCase()} `,
      "abc",
      algorithm,
    );

    assert.deepEqual(matching, {
      digest: expected,
      matches: true,
      error: "",
    });
    assert.equal(
      (await verifyShaCandidate(expected, "abd", algorithm)).matches,
      false,
    );
    assert.equal(
      verifyShaDigest(expected.toUpperCase(), expected, algorithm).matches,
      true,
    );
  }
});

test("reports missing and algorithm-specific malformed digests", async () => {
  const missing = await verifyShaCandidate("", "abc", "SHA-256");
  assert.equal(missing.matches, null);
  assert.equal(missing.error, "请输入要校验的 SHA-256 摘要。");

  for (const algorithm of SHA_ALGORITHMS) {
    const invalid = await verifyShaCandidate("not-a-digest", "abc", algorithm);
    assert.equal(invalid.matches, null);
    assert.match(
      invalid.error,
      new RegExp(`${SHA_DIGEST_LENGTHS[algorithm]} 位十六进制`),
    );
  }
});
