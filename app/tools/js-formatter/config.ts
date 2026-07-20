import { defineTool } from "../../tool-types";

export const jsFormatterToolConfig = defineTool({
  id: "js-formatter",
  title: "JavaScript 格式化压缩",
  summary: "格式化或压缩现代 JavaScript 与 ES Modules。",
  category: "dev",
  mark: "JS",
  searchTerms: [
    "javascript",
    "js",
    "脚本",
    "格式化",
    "美化",
    "压缩",
    "minify",
    "beautify",
    "esm",
  ],
  load: () => import("./js-formatter-tool"),
});
