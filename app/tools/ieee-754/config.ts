import { defineTool } from "../../tool-types";

export const ieee754ToolConfig = defineTool({
  id: "ieee-754",
  title: "IEEE-754 浮点数转换",
  summary: "在十进制数与 Float32/Float64 位模式之间双向转换。",
  category: "dev",
  mark: "FP",
  searchTerms: [
    "浮点数",
    "IEEE 754",
    "float32",
    "float64",
    "单精度",
    "双精度",
    "二进制",
    "十六进制",
  ],
  load: () => import("./ieee-754-tool"),
});
