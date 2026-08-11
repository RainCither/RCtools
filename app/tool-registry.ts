/** 汇总所有内置工具配置，并提供分类、查找和类型守卫。 */
import { base64ToolConfig } from "./tools/base64/config";
import { baseConverterToolConfig } from "./tools/base-converter/config";
import { colorToolConfig } from "./tools/color/config";
import { cssFormatterToolConfig } from "./tools/css-formatter/config";
import { glitchTextToolConfig } from "./tools/glitch-text/config";
import { htmlFormatterToolConfig } from "./tools/html-formatter/config";
import { ieee754ToolConfig } from "./tools/ieee-754/config";
import { jsFormatterToolConfig } from "./tools/js-formatter/config";
import { jsonToolConfig } from "./tools/json/config";
import { md5ToolConfig } from "./tools/md5/config";
import { passwordToolConfig } from "./tools/password/config";
import { regexToolConfig } from "./tools/regex/config";
import { shaToolConfig } from "./tools/sha/config";
import { textStatsToolConfig } from "./tools/text-stats/config";
import { timeDiffToolConfig } from "./tools/time-diff/config";
import { timestampToolConfig } from "./tools/timestamp/config";
import { TOOL_CATEGORY_LABELS, type ToolDefinition } from "./tool-types";

export type { ToolCategory, ToolDefinition } from "./tool-types";

/** 首页可选择的工具分类筛选项。 */
export const TOOL_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "text", label: TOOL_CATEGORY_LABELS.text },
  { id: "dev", label: TOOL_CATEGORY_LABELS.dev },
  { id: "date", label: TOOL_CATEGORY_LABELS.date },
  { id: "other", label: TOOL_CATEGORY_LABELS.other },
] as const;

/** 分类筛选控件允许使用的 id。 */
export type CategoryFilter = (typeof TOOL_CATEGORIES)[number]["id"];

/** 按首页展示顺序排列的完整内置工具注册表。 */
export const TOOLS = [
  jsonToolConfig,
  cssFormatterToolConfig,
  jsFormatterToolConfig,
  htmlFormatterToolConfig,
  regexToolConfig,
  timestampToolConfig,
  timeDiffToolConfig,
  textStatsToolConfig,
  glitchTextToolConfig,
  passwordToolConfig,
  base64ToolConfig,
  md5ToolConfig,
  shaToolConfig,
  baseConverterToolConfig,
  ieee754ToolConfig,
  colorToolConfig,
] as const satisfies readonly ToolDefinition[];

/** 从注册表推导出的有效工具 id 联合类型。 */
export type ToolId = (typeof TOOLS)[number]["id"];
/** 注册表中任意一项工具配置的联合类型。 */
export type RegisteredTool = (typeof TOOLS)[number];

const TOOL_BY_ID: ReadonlyMap<string, RegisteredTool> = new Map(
  TOOLS.map((tool) => [tool.id, tool] as [string, RegisteredTool]),
);

/** 首次访问且没有本地记录时展示的最近工具。 */
export const DEFAULT_RECENT: ToolId[] = ["json", "timestamp", "text-stats"];

/** 判断任意字符串是否为当前注册表中的工具 id。 */
export function isToolId(value: string): value is ToolId {
  return TOOL_BY_ID.has(value);
}

/** 按 id 查找工具元数据；不存在时返回 undefined。 */
export function findTool(toolId: string): RegisteredTool | undefined {
  return TOOL_BY_ID.get(toolId);
}
