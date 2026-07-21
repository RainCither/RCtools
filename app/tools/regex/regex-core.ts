export const MAX_DISPLAYED_MATCHES = 500;

export const REGEX_FLAGS = ["g", "i", "m", "s", "u"] as const;

export type RegexFlag = (typeof REGEX_FLAGS)[number];
export type RegexFlagState = Record<RegexFlag, boolean>;

export const DEFAULT_REGEX_FLAGS: RegexFlagState = {
  g: true,
  i: false,
  m: false,
  s: false,
  u: false,
};

export type RegexMatch = {
  index: number;
  end: number;
  value: string;
  captures: Array<string | undefined>;
  namedGroups: Record<string, string | undefined>;
};

export type RegexExecutionIdle = {
  status: "idle";
  matches: [];
  truncated: false;
};

export type RegexExecutionError = {
  status: "error";
  error: string;
  matches: [];
  truncated: false;
};

export type RegexExecutionSuccess = {
  status: "success";
  matches: RegexMatch[];
  truncated: boolean;
};

export type RegexExecutionResult =
  | RegexExecutionIdle
  | RegexExecutionError
  | RegexExecutionSuccess;

export type RegexEvaluation =
  | RegexExecutionIdle
  | RegexExecutionError
  | (RegexExecutionSuccess & { replacedText: string });

export function serializeRegexFlags(flags: RegexFlagState) {
  return REGEX_FLAGS.filter((flag) => flags[flag]).join("");
}

function formatRegexError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "未知错误";
  return `正则表达式无效：${message}`;
}

function advanceStringIndex(value: string, index: number, unicode: boolean) {
  if (!unicode || index + 1 >= value.length) return index + 1;

  const first = value.charCodeAt(index);
  if (first < 0xd800 || first > 0xdbff) return index + 1;

  const second = value.charCodeAt(index + 1);
  return second >= 0xdc00 && second <= 0xdfff ? index + 2 : index + 1;
}

function toRegexMatch(match: RegExpExecArray): RegexMatch {
  return {
    index: match.index,
    end: match.index + match[0].length,
    value: match[0],
    captures: match.slice(1),
    namedGroups: { ...(match.groups ?? {}) },
  };
}

export function executeRegex(
  pattern: string,
  flags: string,
  source: string,
  maxMatches = MAX_DISPLAYED_MATCHES,
): RegexExecutionResult {
  if (!pattern) {
    return { status: "idle", matches: [], truncated: false };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (cause) {
    return {
      status: "error",
      error: formatRegexError(cause),
      matches: [],
      truncated: false,
    };
  }

  const matches: RegexMatch[] = [];
  let match = regex.exec(source);

  while (match) {
    if (matches.length >= maxMatches) {
      return { status: "success", matches, truncated: true };
    }

    matches.push(toRegexMatch(match));
    if (!regex.global) break;

    if (match[0] === "") {
      regex.lastIndex = advanceStringIndex(source, regex.lastIndex, regex.unicode);
    }
    match = regex.exec(source);
  }

  return { status: "success", matches, truncated: false };
}

export function replaceRegex(
  pattern: string,
  flags: string,
  source: string,
  replacement: string,
) {
  if (!pattern) return "";
  return source.replace(new RegExp(pattern, flags), replacement);
}

export function evaluateRegex(
  pattern: string,
  flags: string,
  source: string,
  replacement: string,
  maxMatches = MAX_DISPLAYED_MATCHES,
): RegexEvaluation {
  const execution = executeRegex(pattern, flags, source, maxMatches);
  if (execution.status !== "success") return execution;

  return {
    ...execution,
    replacedText: replaceRegex(pattern, flags, source, replacement),
  };
}
