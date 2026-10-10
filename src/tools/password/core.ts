/** @file 定义字符池，用注入的随机索引生成密码，确保每个启用类别至少出现一次并打乱字符顺序。 */
import type { RandomPort } from "../../contracts/ports";
export const PASSWORD_POOLS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  number: "23456789",
  symbol: "!@#$%^&*+-_=",
};
/** 按 length 和 options 选择字符池，使用 random 保证各启用类别至少出现一次并洗牌，返回密码。 */
export function generatePassword(
  length: number,
  options: Record<keyof typeof PASSWORD_POOLS, boolean>,
  random: RandomPort,
) {
  const pools = (Object.keys(PASSWORD_POOLS) as (keyof typeof PASSWORD_POOLS)[])
    .filter((key) => options[key])
    .map((key) => PASSWORD_POOLS[key]);
  if (!pools.length) throw new Error("请至少选择一种字符类型。");
  const combined = pools.join("");
  // 先为每个启用类别抽取一个字符，保证生成结果实际满足类别选择。
  const characters = pools.map((pool) => pool.charAt(random.index(pool.length)));
  while (characters.length < length)
    characters.push(combined.charAt(random.index(combined.length)));
  // 使用同一随机能力洗牌，避免保证类别的字符总是出现在固定位置。
  for (let index = characters.length - 1; index > 0; index--) {
    const target = random.index(index + 1);
    const value = characters[index] ?? "";
    characters[index] = characters[target] ?? "";
    characters[target] = value;
  }
  return characters.join("");
}
