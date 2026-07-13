"use client";

import { useState } from "react";
import { ToolStatus } from "../shared/tool-ui";
import styles from "./styles.module.css";

function normalizeHex(value: string) {
  const clean = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean.split("").map((character) => character.repeat(2)).join("")}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean}`.toUpperCase();
  return null;
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const difference = max - min;
    saturation = lightness > 0.5 ? difference / (2 - max - min) : difference / (max + min);
    if (max === red) hue = (green - blue) / difference + (green < blue ? 6 : 0);
    if (max === green) hue = (blue - red) / difference + 2;
    if (max === blue) hue = (red - green) / difference + 4;
    hue /= 6;
  }

  return { h: Math.round(hue * 360), s: Math.round(saturation * 100), l: Math.round(lightness * 100) };
}

export default function ColorTool() {
  const [input, setInput] = useState("#F26B4D");
  const normalized = normalizeHex(input);
  const rgb = normalized ? hexToRgb(normalized) : null;
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;

  return (
    <div className="tool-form">
      <label className="field-label" htmlFor="color-text">HEX 颜色</label>
      <div className={styles.inputRow}>
        <input aria-label="选择颜色" className={styles.picker} type="color" value={normalized ?? "#F26B4D"} onChange={(event) => setInput(event.target.value.toUpperCase())} />
        <input id="color-text" className="tool-input tool-code" value={input} onChange={(event) => setInput(event.target.value)} placeholder="#F26B4D" />
      </div>
      <ToolStatus error={normalized ? undefined : "请输入 3 位或 6 位 HEX 颜色。"} message={normalized ? "颜色转换完成。" : undefined} />
      <div className={styles.preview} style={{ backgroundColor: normalized ?? "#F26B4D" }} aria-label={`颜色预览 ${normalized ?? "无效"}`} />
      <dl className="result-list">
        <div><dt>HEX</dt><dd>{normalized ?? "—"}</dd></div>
        <div><dt>RGB</dt><dd>{rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : "—"}</dd></div>
        <div><dt>HSL</dt><dd>{hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : "—"}</dd></div>
      </dl>
    </div>
  );
}
