const ROTATION_AMOUNTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
] as const;

const ROUND_CONSTANTS = Uint32Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x1_0000_0000),
);

const MD5_PATTERN = /^[0-9a-f]{32}$/i;

function rotateLeft(value: number, amount: number) {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function wordToLittleEndianHex(word: number) {
  let result = "";
  for (let byteIndex = 0; byteIndex < 4; byteIndex += 1) {
    result += ((word >>> (byteIndex * 8)) & 0xff).toString(16).padStart(2, "0");
  }
  return result;
}

export function md5Hex(value: string) {
  const sourceBytes = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((sourceBytes.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(sourceBytes);
  bytes[sourceBytes.length] = 0x80;

  const bitLength = sourceBytes.length * 8;
  const lowLength = bitLength >>> 0;
  const highLength = Math.floor(bitLength / 0x1_0000_0000) >>> 0;
  for (let index = 0; index < 4; index += 1) {
    bytes[paddedLength - 8 + index] = (lowLength >>> (index * 8)) & 0xff;
    bytes[paddedLength - 4 + index] = (highLength >>> (index * 8)) & 0xff;
  }

  let stateA = 0x67452301;
  let stateB = 0xefcdab89;
  let stateC = 0x98badcfe;
  let stateD = 0x10325476;
  const words = new Uint32Array(16);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const wordOffset = offset + index * 4;
      words[index] =
        (bytes[wordOffset] |
          (bytes[wordOffset + 1] << 8) |
          (bytes[wordOffset + 2] << 16) |
          (bytes[wordOffset + 3] << 24)) >>>
        0;
    }

    let a = stateA;
    let b = stateB;
    let c = stateC;
    let d = stateD;

    for (let index = 0; index < 64; index += 1) {
      let mixed: number;
      let wordIndex: number;

      if (index < 16) {
        mixed = (b & c) | (~b & d);
        wordIndex = index;
      } else if (index < 32) {
        mixed = (d & b) | (~d & c);
        wordIndex = (5 * index + 1) % 16;
      } else if (index < 48) {
        mixed = b ^ c ^ d;
        wordIndex = (3 * index + 5) % 16;
      } else {
        mixed = c ^ (b | ~d);
        wordIndex = (7 * index) % 16;
      }

      const nextB =
        (b +
          rotateLeft(
            (a + mixed + ROUND_CONSTANTS[index] + words[wordIndex]) >>> 0,
            ROTATION_AMOUNTS[index],
          )) >>>
        0;
      a = d;
      d = c;
      c = b;
      b = nextB;
    }

    stateA = (stateA + a) >>> 0;
    stateB = (stateB + b) >>> 0;
    stateC = (stateC + c) >>> 0;
    stateD = (stateD + d) >>> 0;
  }

  return [stateA, stateB, stateC, stateD].map(wordToLittleEndianHex).join("");
}

export type Md5Verification = {
  digest: string;
  matches: boolean | null;
  error: string;
};

export function verifyMd5Candidate(
  expectedDigest: string,
  candidate: string,
): Md5Verification {
  const normalizedDigest = expectedDigest.trim().toLowerCase();
  const digest = md5Hex(candidate);

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
