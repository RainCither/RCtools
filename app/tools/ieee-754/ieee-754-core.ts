export type FloatFormat = "float32" | "float64";

export type FloatInputMode = "number" | "bits";

export type FloatClassification =
  | "zero"
  | "subnormal"
  | "normal"
  | "infinity"
  | "nan";

export type FloatConversionData = {
  format: FloatFormat;
  value: number;
  storedValue: string;
  classification: FloatClassification;
  signBit: string;
  exponentBits: string;
  fractionBits: string;
  binary: string;
  hex: string;
  bigEndianBytes: string;
  littleEndianBytes: string;
};

export type FloatConversionResult = {
  data: FloatConversionData | null;
  error: string;
};

type FloatFormatDefinition = {
  totalBits: 32 | 64;
  exponentBits: 8 | 11;
  fractionBits: 23 | 52;
  byteLength: 4 | 8;
  hexLength: 8 | 16;
};

export const FLOAT_FORMATS: Record<FloatFormat, FloatFormatDefinition> = {
  float32: {
    totalBits: 32,
    exponentBits: 8,
    fractionBits: 23,
    byteLength: 4,
    hexLength: 8,
  },
  float64: {
    totalBits: 64,
    exponentBits: 11,
    fractionBits: 52,
    byteLength: 8,
    hexLength: 16,
  },
};

const DECIMAL_NUMBER_PATTERN =
  /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;

const CANONICAL_NAN_BYTES: Record<FloatFormat, readonly number[]> = {
  float32: [0x7f, 0xc0, 0x00, 0x00],
  float64: [0x7f, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
};

function emptyResult(): FloatConversionResult {
  return { data: null, error: "" };
}

function errorResult(error: string): FloatConversionResult {
  return { data: null, error };
}

function bytesToBinary(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(2).padStart(8, "0")).join("");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function formatBytes(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

function formatStoredValue(value: number) {
  if (Object.is(value, -0)) return "-0";
  if (Number.isNaN(value)) return "NaN";
  if (value === Number.POSITIVE_INFINITY) return "Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
  return String(value);
}

function classify(exponentBits: string, fractionBits: string): FloatClassification {
  const exponentIsZero = /^0+$/.test(exponentBits);
  const exponentIsOne = /^1+$/.test(exponentBits);
  const fractionIsZero = /^0+$/.test(fractionBits);

  if (exponentIsZero) return fractionIsZero ? "zero" : "subnormal";
  if (exponentIsOne) return fractionIsZero ? "infinity" : "nan";
  return "normal";
}

function readStoredValue(bytes: Uint8Array, format: FloatFormat) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return format === "float32"
    ? view.getFloat32(0, false)
    : view.getFloat64(0, false);
}

function resultFromBytes(bytes: Uint8Array, format: FloatFormat): FloatConversionResult {
  const definition = FLOAT_FORMATS[format];
  const binary = bytesToBinary(bytes);
  const signBit = binary.slice(0, 1);
  const exponentEnd = 1 + definition.exponentBits;
  const exponentBits = binary.slice(1, exponentEnd);
  const fractionBits = binary.slice(exponentEnd);
  const value = readStoredValue(bytes, format);

  return {
    data: {
      format,
      value,
      storedValue: formatStoredValue(value),
      classification: classify(exponentBits, fractionBits),
      signBit,
      exponentBits,
      fractionBits,
      binary,
      hex: bytesToHex(bytes),
      bigEndianBytes: formatBytes(bytes),
      littleEndianBytes: formatBytes(Uint8Array.from(bytes).reverse()),
    },
    error: "",
  };
}

function encodeNumber(value: number, format: FloatFormat) {
  if (Number.isNaN(value)) {
    return Uint8Array.from(CANONICAL_NAN_BYTES[format]);
  }

  const definition = FLOAT_FORMATS[format];
  const buffer = new ArrayBuffer(definition.byteLength);
  const view = new DataView(buffer);
  if (format === "float32") view.setFloat32(0, value, false);
  else view.setFloat64(0, value, false);
  return new Uint8Array(buffer);
}

function bytesFromBinary(binary: string) {
  const bytes = new Uint8Array(binary.length / 8);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(binary.slice(index * 8, index * 8 + 8), 2);
  }
  return bytes;
}

function bytesFromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function encodeFloatValue(
  input: string,
  format: FloatFormat,
): FloatConversionResult {
  const trimmed = input.trim();
  if (!trimmed) return emptyResult();

  let value: number;
  if (trimmed === "NaN") value = Number.NaN;
  else if (trimmed === "Infinity" || trimmed === "+Infinity") {
    value = Number.POSITIVE_INFINITY;
  } else if (trimmed === "-Infinity") value = Number.NEGATIVE_INFINITY;
  else if (DECIMAL_NUMBER_PATTERN.test(trimmed)) value = Number(trimmed);
  else {
    return errorResult(
      "请输入十进制数、科学计数法、NaN、Infinity 或 -Infinity。",
    );
  }

  return resultFromBytes(encodeNumber(value, format), format);
}

export function decodeFloatPattern(
  input: string,
  format: FloatFormat,
): FloatConversionResult {
  const trimmed = input.trim();
  if (!trimmed) return emptyResult();

  const definition = FLOAT_FORMATS[format];
  const compact = trimmed.replace(/[\s_]/g, "");
  if (!compact) return errorResult("请输入二进制或十六进制位模式。");

  let notation: "binary" | "hex" | null = null;
  let digits = compact;

  if (/^0[bB]/.test(compact)) {
    notation = "binary";
    digits = compact.slice(2);
  } else if (/^0[xX]/.test(compact)) {
    notation = "hex";
    digits = compact.slice(2);
  } else if (/^0[oO]/.test(compact)) {
    return errorResult("位模式仅支持可选的 0b 或 0x 前缀。");
  }

  if (!digits) return errorResult("前缀后还需要输入位模式。");

  if (notation === "binary") {
    if (!/^[01]+$/.test(digits)) {
      return errorResult("二进制位模式只能包含 0 和 1。");
    }
    if (digits.length !== definition.totalBits) {
      return errorResult(
        `${format === "float32" ? "Float32" : "Float64"} 二进制位模式必须正好为 ${definition.totalBits} 位。`,
      );
    }
    return resultFromBytes(bytesFromBinary(digits), format);
  }

  if (notation === "hex") {
    if (!/^[0-9a-fA-F]+$/.test(digits)) {
      return errorResult("十六进制位模式只能包含 0–9 和 A–F。");
    }
    if (digits.length !== definition.hexLength) {
      return errorResult(
        `${format === "float32" ? "Float32" : "Float64"} 十六进制位模式必须正好为 ${definition.hexLength} 个字符。`,
      );
    }
    return resultFromBytes(bytesFromHex(digits), format);
  }

  if (/^[01]+$/.test(digits) && digits.length === definition.totalBits) {
    return resultFromBytes(bytesFromBinary(digits), format);
  }
  if (/^[0-9a-fA-F]+$/.test(digits) && digits.length === definition.hexLength) {
    return resultFromBytes(bytesFromHex(digits), format);
  }
  if (!/^[0-9a-fA-F]+$/.test(digits)) {
    return errorResult("位模式只能包含二进制或十六进制字符。");
  }

  return errorResult(
    `${format === "float32" ? "Float32" : "Float64"} 需要 ${definition.totalBits} 位二进制或 ${definition.hexLength} 个十六进制字符。`,
  );
}

export function convertFloatInput(
  input: string,
  format: FloatFormat,
  mode: FloatInputMode,
): FloatConversionResult {
  return mode === "number"
    ? encodeFloatValue(input, format)
    : decodeFloatPattern(input, format);
}
