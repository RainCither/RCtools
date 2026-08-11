/** 注册 SHA-1、SHA-256 与 SHA-512 摘要计算和校验工具。 */
import { defineTool } from "../../tool-types";

/** SHA 工具的首页元数据与懒加载入口。 */
export const shaToolConfig = defineTool({
  id: "sha",
  title: "SHA-1 / SHA-2 哈希与校验",
  summary:
    "计算文本或小文件的 SHA-1、SHA-256 或 SHA-512 摘要，并校验候选内容。",
  category: "dev",
  mark: "SHA",
  searchTerms: [
    "sha",
    "sha1",
    "sha-1",
    "sha2",
    "sha-2",
    "sha256",
    "sha-256",
    "sha512",
    "sha-512",
    "加密",
    "哈希",
    "散列",
    "摘要",
    "校验",
    "文件",
    "hash",
    "digest",
  ],
  load: () => import("./sha-tool"),
});
