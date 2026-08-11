/** 注册支持常用进制精确整数互转的工具。 */
import { defineTool } from "../../tool-types";

/** 进制转换工具的首页元数据与懒加载入口。 */
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
