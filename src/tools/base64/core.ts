export function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
import { failure } from "../../contracts/result";
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
