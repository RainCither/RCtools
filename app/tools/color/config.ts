import { defineTool } from "../../tool-types";

export const colorToolConfig = defineTool({
  id: "color",
  title: "颜色转换",
  summary: "将 HEX 颜色转换为 RGB 与 HSL。",
  category: "dev",
  mark: "#",
  searchTerms: ["颜色", "hex", "rgb", "hsl", "color"],
  load: () => import("./color-tool"),
});
