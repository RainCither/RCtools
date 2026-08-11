/** 注册连续与成对时间间隔计算工具。 */
import { defineTool } from "../../tool-types";

/** 时间差工具的首页元数据与懒加载入口。 */
export const timeDiffToolConfig = defineTool({
  id: "time-diff",
  title: "连续时间差",
  summary: "连续或成对输入时间，计算间隔与累计总时长。",
  category: "date",
  mark: "Δt",
  searchTerms: [
    "时间差",
    "时长",
    "间隔",
    "连续时间",
    "成对时间差",
    "时间对",
    "time difference",
  ],
  load: () => import("./time-diff-tool"),
});
