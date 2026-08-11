/** 注册基于 Unicode 组合符的故障文字生成工具。 */
import { defineTool } from "../../tool-types";

/** 故障文字工具的首页元数据与懒加载入口。 */
export const glitchTextToolConfig = defineTool({
  id: "glitch-text",
  title: "故障文字生成",
  summary: "用 Unicode 组合符生成可复制的故障、错位文字。",
  category: "text",
  mark: "G̷",
  searchTerms: ["故障", "文字", "zalgo", "glitch", "unicode", "组合符"],
  load: () => import("./glitch-text-tool"),
});
