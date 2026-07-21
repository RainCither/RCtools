import { defineTool } from "../../tool-types";

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
