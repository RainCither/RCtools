/** @file 规范化 3 位或 6 位 HEX 颜色，计算 RGB 数值，再转换为 HSL。 */
/** 校验 value 的 3 位或 6 位 HEX 格式，返回统一大写颜色或空值。 */
export function normalizeHex(value: string) {
  const clean = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .split("")
      .map((character) => character.repeat(2))
      .join("")}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean}`.toUpperCase();
  return null;
}
/** 从规范化 hex 提取三个颜色通道，返回整数 RGB 数值。 */
export function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
/** 将 r、g、b 归一化并计算色相、饱和度和亮度，返回适合展示的 HSL 整数。 */
export function rgbToHsl(r: number, g: number, b: number) {
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

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}
