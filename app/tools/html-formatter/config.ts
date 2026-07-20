import { defineTool } from "../../tool-types";

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
