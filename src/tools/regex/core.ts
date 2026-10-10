/** @file 执行浏览器原生正则匹配与替换，并安全处理零长度匹配和结果上限。 */
/** 为避免大结果阻塞界面，最多展示的匹配项数量。 */
export const MAX_DISPLAYED_MATCHES = 500;

/** 工具界面开放的 JavaScript RegExp 标志及其固定顺序。 */
export const REGEX_FLAGS = ["g", "i", "m", "s", "u"] as const;

/** 单个受支持的正则标志。 */
export type RegexFlag = (typeof REGEX_FLAGS)[number];
/** 所有正则标志的开关状态。 */
export type RegexFlagState = Record<RegexFlag, boolean>;

/** 新建测试器使用的默认标志组合。 */
export const DEFAULT_REGEX_FLAGS: RegexFlagState = {
  g: true,
  i: false,
  m: false,
  s: false,
  u: false,
};

/** 可展示的完整匹配、位置及捕获组快照。 */
export type RegexMatch = {
  index: number;
  end: number;
  value: string;
  captures: Array<string | undefined>;
  namedGroups: Record<string, string | undefined>;
};

/** 尚未输入表达式时的执行状态。 */
export type RegexExecutionIdle = {
  status: "idle";
  matches: [];
  truncated: false;
};

/** 表达式无法编译时的执行状态。 */
export type RegexExecutionError = {
  status: "error";
  error: string;
  matches: [];
  truncated: false;
};

/** 正则成功执行后的匹配列表与截断标记。 */
export type RegexExecutionSuccess = {
  status: "success";
  matches: RegexMatch[];
  truncated: boolean;
};

/** 正则执行可能返回的全部状态联合。 */
export type RegexExecutionResult = RegexExecutionIdle | RegexExecutionError | RegexExecutionSuccess;

/** 在成功执行状态上附加替换预览的完整求值结果。 */
export type RegexEvaluation =
  RegexExecutionIdle | RegexExecutionError | (RegexExecutionSuccess & { replacedText: string });

/** 按固定顺序将开关状态序列化为 RegExp flags 字符串。 */
export function serializeRegexFlags(flags: RegexFlagState) {
  return REGEX_FLAGS.filter((flag) => flags[flag]).join("");
}

/** 将 RegExp 构造错误包装为统一中文提示。 */
function formatRegexError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "未知错误";
  return `正则表达式无效：${message}`;
}

/** 按 ECMAScript 规则推进 UTF-16 索引，避免零长度全局匹配死循环。 */
function advanceStringIndex(value: string, index: number, unicode: boolean) {
  if (!unicode || index + 1 >= value.length) return index + 1;

  const first = value.charCodeAt(index);
  if (first < 0xd800 || first > 0xdbff) return index + 1;

  const second = value.charCodeAt(index + 1);
  return second >= 0xdc00 && second <= 0xdfff ? index + 2 : index + 1;
}

/** 将原生 RegExpExecArray 转为稳定、可渲染的匹配结构。 */
function toRegexMatch(match: RegExpExecArray): RegexMatch {
  return {
    index: match.index,
    end: match.index + match[0].length,
    value: match[0],
    captures: match.slice(1),
    namedGroups: { ...(match.groups ?? {}) },
  };
}

/** 编译并执行正则，在上限内收集完整匹配与捕获组。 */
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

    // 原生 exec 的零长度全局匹配不会自动推进，需要按 Unicode 标志移动索引防止死循环。
    if (match[0] === "") {
      regex.lastIndex = advanceStringIndex(source, regex.lastIndex, regex.unicode);
    }
    match = regex.exec(source);
  }

  return { status: "success", matches, truncated: false };
}

/** 使用 JavaScript 原生替换字符串语义生成替换结果。 */
export function replaceRegex(pattern: string, flags: string, source: string, replacement: string) {
  if (!pattern) return "";
  return source.replace(new RegExp(pattern, flags), replacement);
}

/** 一次性计算匹配列表、截断状态与替换预览。 */
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
