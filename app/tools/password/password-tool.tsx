"use client";

import { useState } from "react";
import { CopyButton, ToolStatus } from "../shared/tool-ui";
import styles from "./styles.module.css";

const PASSWORD_POOLS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  number: "23456789",
  symbol: "!@#$%^&*+-_=",
};

const UINT32_RANGE = 0x1_0000_0000;

function secureRandomIndex(maxExclusive: number) {
  const unbiasedLimit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
  const random = new Uint32Array(1);

  do {
    crypto.getRandomValues(random);
  } while (random[0] >= unbiasedLimit);

  return random[0] % maxExclusive;
}

function randomCharacter(pool: string) {
  return pool.charAt(secureRandomIndex(pool.length));
}

function secureShuffle(characters: string[]) {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const target = secureRandomIndex(index + 1);
    [characters[index], characters[target]] = [characters[target], characters[index]];
  }
  return characters;
}

export default function PasswordTool() {
  const [length, setLength] = useState(18);
  const [options, setOptions] = useState({ lower: true, upper: true, number: true, symbol: false });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function generate() {
    const selectedPools = (Object.keys(PASSWORD_POOLS) as Array<keyof typeof PASSWORD_POOLS>)
      .filter((key) => options[key])
      .map((key) => PASSWORD_POOLS[key]);

    if (!selectedPools.length) {
      setPassword("");
      setError("请至少选择一种字符类型。");
      return;
    }

    const combinedPool = selectedPools.join("");
    const characters = selectedPools.map(randomCharacter);

    while (characters.length < length) {
      characters.push(randomCharacter(combinedPool));
    }

    setPassword(secureShuffle(characters).join(""));
    setError("");
  }

  return (
    <div className="tool-form">
      <div className={styles.rangeHeading}>
        <label className="field-label" htmlFor="password-length">密码长度</label>
        <strong>{length}</strong>
      </div>
      <input id="password-length" className={styles.range} type="range" min="8" max="40" value={length} onChange={(event) => setLength(Number(event.target.value))} />
      <fieldset className={styles.optionGrid}>
        <legend className="field-label">包含字符</legend>
        {(Object.keys(PASSWORD_POOLS) as Array<keyof typeof PASSWORD_POOLS>).map((key) => (
          <label key={key}>
            <input type="checkbox" checked={options[key]} onChange={(event) => setOptions((current) => ({ ...current, [key]: event.target.checked }))} />
            {{ lower: "小写字母", upper: "大写字母", number: "数字", symbol: "符号" }[key]}
          </label>
        ))}
      </fieldset>
      <div className="tool-actions">
        <button className="button button-primary" type="button" onClick={generate}>生成密码</button>
        <CopyButton value={password} />
      </div>
      <ToolStatus error={error} message={password ? "已使用浏览器安全随机数生成。" : undefined} />
      <output className={styles.output} aria-label="生成的密码">{password || "点击“生成密码”开始"}</output>
    </div>
  );
}
