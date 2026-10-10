/** @file 统计字符数、去空白字符数、字词和行数；字符数使用 JavaScript 字符串长度，字词按英文数字串及单个汉字计算。 */
/** 统计 input 的字符串长度、去空白长度、英文数字词或汉字及行数，返回四项结果。 */
export function countText(input: string) {
  // 沿用既有统计口径：字符按字符串长度，字词为英文数字串或单个汉字。
  return {
    characters: input.length,
    noSpaces: input.replace(/\s/g, "").length,
    words: (input.match(/[A-Za-z0-9]+|[\u3400-\u9fff]/g) ?? []).length,
    lines: input ? input.split(/\r\n|\r|\n/).length : 0,
  };
}
