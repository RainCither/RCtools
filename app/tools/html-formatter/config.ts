/** 注册 HTML 及其内嵌资源的格式化与压缩工具。 */
import { defineTool } from "../../tool-types";

/** HTML 格式化工具的首页元数据与懒加载入口。 */
export const htmlFormatterToolConfig = defineTool({
  id: "html-formatter",
  title: "HTML 格式化压缩",
  summary: "格式化或保守压缩 HTML，并处理内嵌 CSS 与 JavaScript。",
  category: "dev",
  mark: "HTML",
  searchTerms: [
    "html",
    "网页",
    "标记",
    "格式化",
    "美化",
    "压缩",
    "minify",
    "beautify",
  ],
  load: () => import("./html-formatter-tool"),
});
