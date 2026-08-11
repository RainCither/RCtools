/** 注册支持 UTF-8 文本的 Base64 编解码工具。 */
import { defineTool } from "../../tool-types";

/** Base64 工具的首页元数据与懒加载入口。 */
export const base64ToolConfig = defineTool({
  id: "base64",
  title: "Base64 编解码",
  summary: "支持中文内容的 Base64 编码与解码。",
  category: "dev",
  mark: "64",
  searchTerms: ["base64", "编码", "解码", "文本"],
  load: () => import("./base64-tool"),
});
