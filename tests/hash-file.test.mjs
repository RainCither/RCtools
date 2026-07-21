import assert from "node:assert/strict";
import test from "node:test";
import {
  formatHashFileSize,
  MAX_HASH_FILE_BYTES,
  MAX_HASH_FILE_LABEL,
  readHashFileBytes,
  validateHashFile,
} from "../app/tools/shared/hash-file.ts";

test("uses an exact inclusive 20 MiB file limit", () => {
  assert.equal(MAX_HASH_FILE_BYTES, 20_971_520);
  assert.equal(MAX_HASH_FILE_LABEL, "20 MiB");
  assert.equal(validateHashFile({ size: 0 }), "");
  assert.equal(validateHashFile({ size: MAX_HASH_FILE_BYTES }), "");
  assert.equal(
    validateHashFile({ size: MAX_HASH_FILE_BYTES + 1 }),
    "文件不能超过 20 MiB。",
  );
});

test("formats selected file sizes with KiB and MiB labels", () => {
  assert.equal(formatHashFileSize(0), "0 B");
  assert.equal(formatHashFileSize(1_024), "1 KiB");
  assert.equal(formatHashFileSize(1_572_864), "1.5 MiB");
  assert.equal(formatHashFileSize(MAX_HASH_FILE_BYTES), "20 MiB");
});

test("reads the entire file into bytes", async () => {
  const bytes = await readHashFileBytes({
    size: 3,
    async arrayBuffer() {
      return Uint8Array.from([0x00, 0xff, 0x7f]).buffer;
    },
  });

  assert.deepEqual(bytes, Uint8Array.from([0x00, 0xff, 0x7f]));
});

test("rejects oversized files before reading", async () => {
  let read = false;
  await assert.rejects(
    readHashFileBytes({
      size: MAX_HASH_FILE_BYTES + 1,
      async arrayBuffer() {
        read = true;
        return new ArrayBuffer(0);
      },
    }),
    /文件不能超过 20 MiB/,
  );
  assert.equal(read, false);
});

test("converts browser read failures to a stable local error", async () => {
  await assert.rejects(
    readHashFileBytes({
      size: 1,
      async arrayBuffer() {
        throw new Error("browser-specific failure");
      },
    }),
    /文件读取失败，请重新选择后再试/,
  );
});
