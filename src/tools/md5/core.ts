/** 计算 MD5 摘要并校验候选内容或既有摘要。 */
import hashWasmMd5 from "hash-wasm/dist/md5.umd.min.js";

const { md5 } = hashWasmMd5;

const MD5_PATTERN = /^[0-9a-f]{32}$/i;

/** 计算原始字节的 MD5 十六进制摘要。 */
export function md5Bytes(value: Uint8Array) {
  return md5(value);
}

/** 按 UTF-8 编码文本并计算 MD5 摘要。 */
export function md5Hex(value: string) {
  return md5Bytes(new TextEncoder().encode(value));
}

/** MD5 校验得到的规范摘要、匹配状态与格式错误。 */
export type Md5Verification = {
  digest: string;
  matches: boolean | null;
  error: string;
};

/** 校验目标摘要格式，并与已计算摘要比较。 */
export function verifyMd5Digest(expectedDigest: string, digest: string): Md5Verification {
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

/** 计算候选文本摘要后与目标 MD5 比较。 */
export async function verifyMd5Candidate(expectedDigest: string, candidate: string) {
  return verifyMd5Digest(expectedDigest, await md5Hex(candidate));
}
