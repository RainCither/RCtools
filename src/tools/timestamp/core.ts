/** @file 解析 10 位秒时间戳、13 位毫秒时间戳或日期文本，输出本地时间、ISO 时间、秒和毫秒表示。 */
import { failure } from "../../contracts/result";
/** 解析 value 中的秒/毫秒时间戳或日期文本，返回本地、ISO、秒与毫秒表示。 */
export function convertTimestamp(value: string) {
  const clean = value.trim();
  if (!clean)
    throw failure("validation", "timestamp.input", "请输入 10/13 位时间戳或可识别的日期时间。");
  let date: Date;
  if (/^-?\d+$/.test(clean)) {
    // 根据明确位数区分秒与毫秒，避免把任意短整数猜成时间戳。
    const seconds = /^-?\d{10}$/.test(clean);
    if (!seconds && !/^-?\d{13}$/.test(clean))
      throw failure("validation", "timestamp.length", "时间戳必须是 10 位秒数或 13 位毫秒数。");
    date = new Date(Number(clean) * (seconds ? 1000 : 1));
  } else date = new Date(clean);
  if (Number.isNaN(date.getTime()))
    throw failure("validation", "timestamp.input", "请输入 10/13 位时间戳或可识别的日期时间。");
  return {
    local: date.toLocaleString("zh-CN", { hour12: false }),
    iso: date.toISOString(),
    seconds: Math.floor(date.getTime() / 1000).toString(),
    milliseconds: date.getTime().toString(),
  };
}
