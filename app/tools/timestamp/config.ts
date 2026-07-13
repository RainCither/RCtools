import { defineTool } from "../../tool-types";

export const timestampToolConfig = defineTool({
  id: "timestamp",
  title: "时间戳转换",
  summary: "在时间戳、日期与标准时间之间转换。",
  category: "date",
  mark: "⌁",
  searchTerms: ["时间戳", "日期", "unix", "timestamp"],
  load: () => import("./timestamp-tool"),
});
