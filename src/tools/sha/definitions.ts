/** 工具支持的 SHA 算法及界面排列顺序。 */
export const SHA_ALGORITHMS = ["SHA-1", "SHA-256", "SHA-512"] as const;

/** 单个受支持的 SHA 算法。 */
export type ShaAlgorithm = (typeof SHA_ALGORITHMS)[number];

/** 各算法十六进制摘要必须具备的字符长度。 */
export const SHA_DIGEST_LENGTHS: Record<ShaAlgorithm, number> = {
  "SHA-1": 40,
  "SHA-256": 64,
  "SHA-512": 128,
};
