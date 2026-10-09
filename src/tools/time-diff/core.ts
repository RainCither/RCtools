/** @file 解析时钟输入，计算跨午夜间隔，并格式化单项与累计时长。 */
/** 时间输入和结果可使用的精度格式。 */
export type TimeFormat = "HH:mm" | "HH:mm:ss";

/** 时间输入解析后的当天秒数或校验错误。 */
export type ParsedTime = {
  seconds: number | null;
  error: string;
};

const SECONDS_PER_DAY = 24 * 60 * 60;

/** 将时分秒字段补齐为两位数字。 */
function pad(value: number) {
  return value.toString().padStart(2, "0");
}

/** 按当前格式与分隔符设置解析 24 小时时间。 */
export function parseTimeInput(
  rawValue: string,
  format: TimeFormat,
  omitSeparator: boolean,
): ParsedTime {
  const value = rawValue.trim();
  if (!value) return { seconds: null, error: "" };

  const includesSeconds = format === "HH:mm:ss";
  const pattern = omitSeparator
    ? includesSeconds
      ? /^(\d{2})(\d{2})(\d{2})$/
      : /^(\d{2})(\d{2})$/
    : includesSeconds
      ? /^(\d{2}):(\d{2}):(\d{2})$/
      : /^(\d{2}):(\d{2})$/;
  const match = value.match(pattern);
  const formatHint = omitSeparator ? (includesSeconds ? "HHmmss" : "HHmm") : format;

  if (!match) {
    return { seconds: null, error: `请输入 ${formatHint} 格式的时间。` };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = includesSeconds ? Number(match[3]) : 0;

  if (hour > 23) {
    return { seconds: null, error: "小时必须在 00–23 之间。" };
  }
  if (minute > 59) {
    return { seconds: null, error: "分钟必须在 00–59 之间。" };
  }
  if (second > 59) {
    return { seconds: null, error: "秒必须在 00–59 之间。" };
  }

  return {
    seconds: hour * 60 * 60 + minute * 60 + second,
    error: "",
  };
}

/** 将当天秒数格式化为带或不带冒号的时钟文本。 */
export function formatClockTime(seconds: number, format: TimeFormat, omitSeparator: boolean) {
  const hour = Math.floor(seconds / 3600) % 24;
  const minute = Math.floor((seconds % 3600) / 60);
  const second = seconds % 60;
  const parts = [pad(hour), pad(minute)];
  if (format === "HH:mm:ss") parts.push(pad(second));
  return parts.join(omitSeparator ? "" : ":");
}

/** 计算相邻时刻差；结束时间更小时按次日处理。 */
export function calculateAdjacentDifference(
  startSeconds: number | null,
  endSeconds: number | null,
) {
  if (startSeconds === null || endSeconds === null) return null;
  const adjustedEnd = endSeconds < startSeconds ? endSeconds + SECONDS_PER_DAY : endSeconds;
  return adjustedEnd - startSeconds;
}

/** 所有差值均完整时求和，否则返回 null。 */
export function sumCalculatedDifferences(differences: readonly (number | null)[]) {
  if (!differences.length) return null;

  let total = 0;
  for (const difference of differences) {
    if (difference === null) return null;
    total += difference;
  }
  return total;
}

/** 将秒数格式化为可超过 24 小时的 HH:mm[:ss]。 */
export function formatDuration(seconds: number, format: TimeFormat) {
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  const second = seconds % 60;
  const parts = [pad(hour), pad(minute)];
  if (format === "HH:mm:ss") parts.push(pad(second));
  return parts.join(":");
}

/** 将秒数格式化为中文小时、分钟和秒说明。 */
export function formatDurationText(seconds: number, format: TimeFormat) {
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  const second = seconds % 60;
  const parts: string[] = [];

  if (hour) parts.push(`${hour} 小时`);
  if (minute) parts.push(`${minute} 分钟`);
  if (format === "HH:mm:ss" && second) parts.push(`${second} 秒`);

  if (!parts.length) {
    return format === "HH:mm:ss" ? "0 秒" : "0 分钟";
  }
  return parts.join(" ");
}
