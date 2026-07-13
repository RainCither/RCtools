import { defineTool } from "../../tool-types";

export const textStatsToolConfig = defineTool({
  id: "text-stats",
  title: "文本统计",
  summary: "即时统计字数、字符、单词和行数。",
  category: "text",
  mark: "T",
  searchTerms: ["文本", "字数", "字符", "单词", "统计"],
  load: () => import("./text-stats-tool"),
});
