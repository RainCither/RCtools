/** 注册现代 JavaScript 格式化与压缩工具。 */
import { defineTool } from "../../tool-types";

/** JavaScript 格式化工具的首页元数据与懒加载入口。 */
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
