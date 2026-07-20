import { defineTool } from "../../tool-types";

export const baseConverterToolConfig = defineTool({
  id: "base-converter",
  title: "进制转换",
  summary: "在二、八、十、十六进制整数之间精确转换。",
  category: "dev",
  mark: "0x",
  searchTerms: [
    "进制",
    "二进制",
    "八进制",
    "十进制",
    "十六进制",
    "binary",
    "octal",
    "decimal",
    "hex",
  ],
  load: () => import("./base-converter-tool"),
});
