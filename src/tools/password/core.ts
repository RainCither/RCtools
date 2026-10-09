import type { RandomPort } from "../../contracts/ports";
export const PASSWORD_POOLS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  number: "23456789",
  symbol: "!@#$%^&*+-_=",
};
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
  const characters = pools.map((pool) => pool.charAt(random.index(pool.length)));
  while (characters.length < length)
    characters.push(combined.charAt(random.index(combined.length)));
  for (let index = characters.length - 1; index > 0; index--) {
    const target = random.index(index + 1);
    const value = characters[index] ?? "";
    characters[index] = characters[target] ?? "";
    characters[target] = value;
  }
  return characters.join("");
}
