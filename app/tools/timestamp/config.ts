/** 注册时间戳与日期时间双向转换工具。 */
import { defineTool } from "../../tool-types";

/** 时间戳工具的首页元数据与懒加载入口。 */
export const timestampToolConfig = defineTool({
  id: "timestamp",
  title: "时间戳转换",
  summary: "在时间戳、日期与标准时间之间转换。",
  category: "date",
  mark: "⌁",
  searchTerms: ["时间戳", "日期", "unix", "timestamp"],
  load: () => import("./timestamp-tool"),
});
