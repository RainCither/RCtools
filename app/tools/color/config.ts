/** 注册 HEX、RGB 与 HSL 颜色转换工具。 */
import { defineTool } from "../../tool-types";

/** 颜色转换工具的首页元数据与懒加载入口。 */
export const colorToolConfig = defineTool({
  id: "color",
  title: "颜色转换",
  summary: "将 HEX 颜色转换为 RGB 与 HSL。",
  category: "dev",
  mark: "#",
  searchTerms: ["颜色", "hex", "rgb", "hsl", "color"],
  load: () => import("./color-tool"),
});
