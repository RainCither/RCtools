/** 注册 CSS 格式化与压缩工具。 */
import { defineTool } from "../../tool-types";

/** CSS 格式化工具的首页元数据与懒加载入口。 */
export const cssFormatterToolConfig = defineTool({
  id: "css-formatter",
  title: "CSS 格式化压缩",
  summary: "格式化或压缩标准 CSS 样式代码。",
  category: "dev",
  mark: "CSS",
  searchTerms: ["css", "样式", "格式化", "美化", "压缩", "minify", "beautify"],
  load: () => import("./css-formatter-tool"),
});
