/** @file 将 UTF-8 文本编码为 Base64，或去除 Base64 中空白后解码为文本，支持中文和 Emoji。 */
/** 按 UTF-8 将 value 编成字节再生成 Base64，返回可复制文本以支持中文和 Emoji。 */
export function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
import { failure } from "../../contracts/result";
/** 去除 value 中的 Base64 空白并解码为 UTF-8 文字，成功返回文本，失败时抛出统一输入错误。 */
export function decodeBase64(value: string) {
  try {
    const binary = atob(value.replace(/\s/g, ""));
    return new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    );
  } catch {
    throw failure("validation", "base64.input", "Base64 内容无效，请检查字符和长度后重试。");
  }
}
