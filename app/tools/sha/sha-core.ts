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

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function shaHex(value: string, algorithm: ShaAlgorithm) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("当前环境不支持 Web Crypto API，无法计算 SHA 摘要。");
  }

  const sourceBytes = new TextEncoder().encode(value);
  const digest = await subtle.digest(algorithm, sourceBytes);
  return bytesToHex(new Uint8Array(digest));
}

export type ShaVerification = {
  digest: string;
  matches: boolean | null;
  error: string;
};

export async function verifyShaCandidate(
  expectedDigest: string,
  candidate: string,
  algorithm: ShaAlgorithm,
): Promise<ShaVerification> {
  const normalizedDigest = expectedDigest.trim().toLowerCase();
  const digest = await shaHex(candidate, algorithm);

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
