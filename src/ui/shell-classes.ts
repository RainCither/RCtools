/** @file 将页面语义类名映射到 shell.module.css 的局部类名，供首页和公共布局使用。 */
import styles from "./shell.module.css";
/** 把 value 中的语义类名映射到局部样式，同时保留语义名称供界面识别与测试使用。 */
export function shellClasses(value: string) {
  return value
    .split(/\s+/)
    .map((name) => `${name} ${styles[name] ?? ""}`)
    .join(" ");
}
