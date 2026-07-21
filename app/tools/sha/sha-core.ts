import hashWasmSha1 from "hash-wasm/dist/sha1.umd.min.js";
import hashWasmSha256 from "hash-wasm/dist/sha256.umd.min.js";
import hashWasmSha512 from "hash-wasm/dist/sha512.umd.min.js";

const { sha1 } = hashWasmSha1;
const { sha256 } = hashWasmSha256;
const { sha512 } = hashWasmSha512;

export const SHA_ALGORITHMS = ["SHA-1", "SHA-256", "SHA-512"] as const;

export type ShaAlgorithm = (typeof SHA_ALGORITHMS)[number];

export const SHA_DIGEST_LENGTHS: Record<ShaAlgorithm, number> = {
  "SHA-1": 40,
  "SHA-256": 64,
  "SHA-512": 128,
};

const SHA_PATTERNS: Record<ShaAlgorithm, RegExp> = {
  "SHA-1": /^[0-9a-f]{40}$/i,
  "SHA-256": /^[0-9a-f]{64}$/i,
  "SHA-512": /^[0-9a-f]{128}$/i,
};

const SHA_HASHERS: Record<
  ShaAlgorithm,
  (value: Uint8Array) => Promise<string>
> = {
  "SHA-1": sha1,
  "SHA-256": sha256,
  "SHA-512": sha512,
};

export function shaBytes(value: Uint8Array, algorithm: ShaAlgorithm) {
  return SHA_HASHERS[algorithm](value);
}

export function shaHex(value: string, algorithm: ShaAlgorithm) {
  return shaBytes(new TextEncoder().encode(value), algorithm);
}

export type ShaVerification = {
  digest: string;
  matches: boolean | null;
  error: string;
};

export function verifyShaDigest(
  expectedDigest: string,
  digest: string,
  algorithm: ShaAlgorithm,
): ShaVerification {
  const normalizedDigest = expectedDigest.trim().toLowerCase();

  if (!normalizedDigest) {
    return {
      digest,
      matches: null,
      error: `请输入要校验的 ${algorithm} 摘要。`,
    };
  }

  if (!SHA_PATTERNS[algorithm].test(normalizedDigest)) {
    return {
      digest,
      matches: null,
      error: `${algorithm} 摘要必须是 ${SHA_DIGEST_LENGTHS[algorithm]} 位十六进制字符。`,
    };
  }

  return {
    digest,
    matches: digest === normalizedDigest,
    error: "",
  };
}

export async function verifyShaCandidate(
  expectedDigest: string,
  candidate: string,
  algorithm: ShaAlgorithm,
) {
  return verifyShaDigest(
    expectedDigest,
    await shaHex(candidate, algorithm),
    algorithm,
  );
}
