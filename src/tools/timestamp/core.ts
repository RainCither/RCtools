import { failure } from "../../contracts/result";
export function convertTimestamp(value: string) {
  const clean = value.trim();
  if (!clean)
    throw failure("validation", "timestamp.input", "请输入 10/13 位时间戳或可识别的日期时间。");
  let date: Date;
  if (/^-?\d+$/.test(clean)) {
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
