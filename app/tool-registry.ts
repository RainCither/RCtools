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
import { shaToolConfig } from "./tools/sha/config";
import { textStatsToolConfig } from "./tools/text-stats/config";
import { timeDiffToolConfig } from "./tools/time-diff/config";
import { timestampToolConfig } from "./tools/timestamp/config";
import { TOOL_CATEGORY_LABELS, type ToolDefinition } from "./tool-types";

export type { ToolCategory, ToolDefinition } from "./tool-types";

export const TOOL_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "text", label: TOOL_CATEGORY_LABELS.text },
  { id: "dev", label: TOOL_CATEGORY_LABELS.dev },
  { id: "date", label: TOOL_CATEGORY_LABELS.date },
] as const;

export type CategoryFilter = (typeof TOOL_CATEGORIES)[number]["id"];

export const TOOLS = [
  jsonToolConfig,
  cssFormatterToolConfig,
  jsFormatterToolConfig,
  htmlFormatterToolConfig,
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

export type ToolId = (typeof TOOLS)[number]["id"];
export type RegisteredTool = (typeof TOOLS)[number];

export const DEFAULT_RECENT: ToolId[] = [
  "json",
  "timestamp",
  "text-stats",
];

export function findTool(toolId: ToolId): RegisteredTool | undefined {
  return TOOLS.find((tool) => tool.id === toolId);
}
