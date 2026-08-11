/** 注册 JavaScript 正则测试、替换与语法参考工具。 */
import { defineTool } from "../../tool-types";

/** 正则工具的首页元数据与懒加载入口。 */
export const regexToolConfig = defineTool({
  id: "regex",
  title: "正则表达式测试",
  summary: "实时测试 JavaScript 正则，并查看语法速查与常用表达式。",
  category: "dev",
  mark: ".*",
  searchTerms: [
    "正则",
    "正则表达式",
    "匹配",
    "替换",
    "regex",
    "regexp",
    "pattern",
    "match",
    "replace",
    "语法速查",
    "常用正则",
    "cheatsheet",
    "examples",
  ],
  load: () => import("./regex-tool"),
});
