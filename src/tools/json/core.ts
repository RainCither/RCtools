/** 校验 JSON 并只调整字符串外的空白，保留数字、转义、顺序与重复键原文。 */
function jsonTokens(input: string): string[] {
  JSON.parse(input); // 仅校验；绝不将解析后的 Number 再序列化。
  return input.match(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\],:]|[^ \t\r\n{}\[\],:]+/g) ?? [];
}

/** 移除所有字符串外的 JSON 空白。 */
export function minifyJson(input: string): string {
  return jsonTokens(input).join("");
}

/** 用两空格缩进排版，原始 token 不作任何改写。 */
export function formatJson(input: string): string {
  const tokens = jsonTokens(input);
  const output: string[] = [];
  let depth = 0;
  const newline = () => output.push("\n", "  ".repeat(depth));

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined) continue;
    if (token === "{" || token === "[") {
      output.push(token);
      const closing = tokens[index + 1];
      if (closing === (token === "{" ? "}" : "]")) {
        output.push(closing);
        index++;
      } else {
        depth += 1;
        newline();
      }
    } else if (token === "}" || token === "]") {
      depth -= 1;
      newline();
      output.push(token);
    } else if (token === ",") {
      output.push(token);
      newline();
    } else if (token === ":") {
      output.push(": ");
    } else {
      output.push(token);
    }
  }
  return output.join("");
}
