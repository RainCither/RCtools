import hashWasmMd5 from "hash-wasm/dist/md5.umd.min.js";

const { md5 } = hashWasmMd5;

const MD5_PATTERN = /^[0-9a-f]{32}$/i;

export function md5Bytes(value: Uint8Array) {
  return md5(value);
}

export function md5Hex(value: string) {
  return md5Bytes(new TextEncoder().encode(value));
}

export type Md5Verification = {
  digest: string;
  matches: boolean | null;
  error: string;
};

export function verifyMd5Digest(
  expectedDigest: string,
  digest: string,
): Md5Verification {
  const normalizedDigest = expectedDigest.trim().toLowerCase();

  if (!normalizedDigest) {
    return {
      digest,
      matches: null,
      error: "请输入要校验的 MD5 摘要。",
    };
  }

  if (!MD5_PATTERN.test(normalizedDigest)) {
    return {
      digest,
      matches: null,
      error: "MD5 摘要必须是 32 位十六进制字符。",
    };
  }

  return {
    digest,
    matches: digest === normalizedDigest,
    error: "",
  };
}

export async function verifyMd5Candidate(
  expectedDigest: string,
  candidate: string,
) {
  return verifyMd5Digest(expectedDigest, await md5Hex(candidate));
}
