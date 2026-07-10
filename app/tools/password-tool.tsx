"use client";

import { useState } from "react";
import { CopyButton, ToolStatus } from "./shared";

const PASSWORD_POOLS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  number: "23456789",
  symbol: "!@#$%^&*+-_=",
};

export function PasswordTool() {
  const [length, setLength] = useState(18);
  const [options, setOptions] = useState({ lower: true, upper: true, number: true, symbol: false });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function generate() {
    const pool = (Object.keys(PASSWORD_POOLS) as Array<keyof typeof PASSWORD_POOLS>)
      .filter((key) => options[key])
      .map((key) => PASSWORD_POOLS[key])
      .join("");

    if (!pool) {
      setPassword("");
      setError("请至少选择一种字符类型。");
      return;
    }

    const random = new Uint32Array(length);
    crypto.getRandomValues(random);
    setPassword(Array.from(random, (value) => pool[value % pool.length]).join(""));
    setError("");
  }

  return (
    <div className="tool-form">
      <div className="range-heading">
        <label className="field-label" htmlFor="password-length">密码长度</label>
        <strong>{length}</strong>
      </div>
      <input id="password-length" className="tool-range" type="range" min="8" max="40" value={length} onChange={(event) => setLength(Number(event.target.value))} />
      <fieldset className="option-grid">
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
      <output className="password-output" aria-label="生成的密码">{password || "点击“生成密码”开始"}</output>
    </div>
  );
}
