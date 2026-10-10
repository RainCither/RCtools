/** @file 使用按算法拆分的 hash-wasm 实现文本/字节哈希，并按所选算法校验目标摘要格式和匹配情况。 */
/** 按所选 SHA 算法计算摘要并验证候选内容。 */
import hashWasmSha1 from "hash-wasm/dist/sha1.umd.min.js";
import hashWasmSha256 from "hash-wasm/dist/sha256.umd.min.js";
import hashWasmSha512 from "hash-wasm/dist/sha512.umd.min.js";

const { sha1 } = hashWasmSha1;
const { sha256 } = hashWasmSha256;
const { sha512 } = hashWasmSha512;

import type { ShaAlgorithm } from "./definitions";
import { SHA_DIGEST_LENGTHS } from "./definitions";
export { SHA_ALGORITHMS, SHA_DIGEST_LENGTHS } from "./definitions";
export type { ShaAlgorithm } from "./definitions";
const SHA_PATTERNS: Record<ShaAlgorithm, RegExp> = {
  "SHA-1": /^[0-9a-f]{40}$/i,
  "SHA-256": /^[0-9a-f]{64}$/i,
  "SHA-512": /^[0-9a-f]{128}$/i,
};

const SHA_HASHERS: Record<ShaAlgorithm, (value: Uint8Array) => Promise<string>> = {
  "SHA-1": sha1,
  "SHA-256": sha256,
  "SHA-512": sha512,
};

/** 使用指定 SHA 算法计算原始字节摘要。 */
export function shaBytes(value: Uint8Array, algorithm: ShaAlgorithm) {
  return SHA_HASHERS[algorithm](value);
}

/** 按 UTF-8 编码文本并计算指定 SHA 摘要。 */
export function shaHex(value: string, algorithm: ShaAlgorithm) {
  return shaBytes(new TextEncoder().encode(value), algorithm);
}

/** SHA 校验得到的规范摘要、匹配状态与格式错误。 */
export type ShaVerification = {
  digest: string;
  matches: boolean | null;
  error: string;
};

/** 校验目标摘要的长度和字符，并与已计算摘要比较。 */
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

/** 计算候选文本摘要后与目标 SHA 摘要比较。 */
export async function verifyShaCandidate(
  expectedDigest: string,
  candidate: string,
  algorithm: ShaAlgorithm,
) {
  return verifyShaDigest(expectedDigest, await shaHex(candidate, algorithm), algorithm);
}
