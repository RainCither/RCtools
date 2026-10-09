export function countText(input: string) {
  return {
    characters: input.length,
    noSpaces: input.replace(/\s/g, "").length,
    words: (input.match(/[A-Za-z0-9]+|[\u3400-\u9fff]/g) ?? []).length,
    lines: input ? input.split(/\r\n|\r|\n/).length : 0,
  };
}
