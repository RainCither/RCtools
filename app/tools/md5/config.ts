import { defineTool } from "../../tool-types";

export const md5ToolConfig = defineTool({
  id: "md5",
  title: "MD5 加密与校验",
  summary: "计算文本的 MD5 摘要，并验证候选文本是否匹配指定摘要。",
  category: "dev",
  mark: "MD5",
  searchTerms: [
    "md5",
    "加密",
    "解密",
    "哈希",
    "散列",
    "摘要",
    "校验",
    "hash",
    "digest",
  ],
  load: () => import("./md5-tool"),
});
