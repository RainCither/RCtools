/** 注册文本字符、字词和行数统计工具。 */
import { defineTool } from "../../tool-types";

/** 文本统计工具的首页元数据与懒加载入口。 */
export const textStatsToolConfig = defineTool({
  id: "text-stats",
  title: "文本统计",
  summary: "即时统计字数、字符、单词和行数。",
  category: "text",
  mark: "T",
  searchTerms: ["文本", "字数", "字符", "单词", "统计"],
  load: () => import("./text-stats-tool"),
});
