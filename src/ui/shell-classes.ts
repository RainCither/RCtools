import styles from "./shell.module.css";
export function shellClasses(value: string) {
  return value
    .split(/\s+/)
    .map((name) => `${name} ${styles[name] ?? ""}`)
    .join(" ");
}
