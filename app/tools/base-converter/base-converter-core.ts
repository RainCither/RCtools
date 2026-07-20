export const COMMON_BASES = [2, 8, 10, 16] as const;

export type CommonBase = (typeof COMMON_BASES)[number];

export type ConversionOutputs = Record<CommonBase, string>;

export type ConversionResult = {
  value: bigint | null;
  outputs: ConversionOutputs | null;
  error: string;
};

const PREFIX_BASES: Record<string, CommonBase> = {
  b: 2,
  o: 8,
  x: 16,
};

function digitValue(character: string) {
  const code = character.toUpperCase().charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 70) return code - 55;
  return -1;
}

function allowedDigits(base: CommonBase) {
  if (base === 2) return "0、1";
  if (base === 8) return "0–7";
  if (base === 10) return "0–9";
  return "0–9、A–F";
}

function formatValue(value: bigint, base: CommonBase) {
  return value.toString(base).toUpperCase();
}

export function convertBaseInteger(
  input: string,
  sourceBase: CommonBase,
): ConversionResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null, outputs: null, error: "" };
  }

  let unsigned = trimmed;
  let sign = BigInt(1);

  if (unsigned[0] === "+" || unsigned[0] === "-") {
    sign = unsigned[0] === "-" ? -BigInt(1) : BigInt(1);
    unsigned = unsigned.slice(1);
  }

  if (!unsigned) {
    return {
      value: null,
      outputs: null,
      error: "正负号后还需要输入数字。",
    };
  }

  const prefixMatch = /^0([bBoOxX])/.exec(unsigned);
  if (prefixMatch) {
    const prefix = `0${prefixMatch[1]}`;
    const prefixBase = PREFIX_BASES[prefixMatch[1].toLowerCase()];

    if (prefixBase !== sourceBase) {
      return {
        value: null,
        outputs: null,
        error: `当前选择的是 ${sourceBase} 进制，不能使用 ${prefix} 前缀。`,
      };
    }

    unsigned = unsigned.slice(2);
    if (!unsigned) {
      return {
        value: null,
        outputs: null,
        error: `${prefix} 前缀后还需要输入数字。`,
      };
    }
  }

  if (/\s/.test(unsigned)) {
    return {
      value: null,
      outputs: null,
      error: "数字中不能包含空格，请连续输入。",
    };
  }

  let value = BigInt(0);
  const baseValue = BigInt(sourceBase);

  for (const character of unsigned) {
    const digit = digitValue(character);
    if (digit < 0 || digit >= sourceBase) {
      return {
        value: null,
        outputs: null,
        error: `${sourceBase} 进制只能使用 ${allowedDigits(sourceBase)}。`,
      };
    }
    value = value * baseValue + BigInt(digit);
  }

  value *= sign;

  const outputs = Object.fromEntries(
    COMMON_BASES.map((base) => [base, formatValue(value, base)]),
  ) as ConversionOutputs;

  return { value, outputs, error: "" };
}
