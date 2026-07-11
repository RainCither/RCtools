export type ToolCategory = "text" | "dev" | "date";

export type ToolId =
  | "json"
  | "timestamp"
  | "text-stats"
  | "password"
  | "base64"
  | "color";

export type ToolDefinition = {
  id: ToolId;
  title: string;
  summary: string;
  category: ToolCategory;
  categoryLabel: string;
  mark: string;
  searchTerms: string[];
};

export const TOOL_CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "text", label: "文本" },
  { id: "dev", label: "开发" },
  { id: "date", label: "日期" },
] as const;

export type CategoryFilter = (typeof TOOL_CATEGORIES)[number]["id"];

export const TOOLS: ToolDefinition[] = [
  {
    id: "json",
    title: "JSON 格式化",
    summary: "校验、格式化或压缩 JSON 数据。",
    category: "dev",
    categoryLabel: "开发",
    mark: "{ }",
    searchTerms: ["json", "格式化", "压缩", "校验"],
  },
  {
    id: "timestamp",
    title: "时间戳转换",
    summary: "在时间戳、日期与标准时间之间转换。",
    category: "date",
    categoryLabel: "日期",
    mark: "⌁",
    searchTerms: ["时间戳", "日期", "unix", "timestamp"],
  },
  {
    id: "text-stats",
    title: "文本统计",
    summary: "即时统计字数、字符、单词和行数。",
    category: "text",
    categoryLabel: "文本",
    mark: "T",
    searchTerms: ["文本", "字数", "字符", "单词", "统计"],
  },
  {
    id: "password",
    title: "密码生成",
    summary: "按长度与字符规则生成随机密码。",
    category: "dev",
    categoryLabel: "开发",
    mark: "✦",
    searchTerms: ["密码", "随机", "password", "安全"],
  },
  {
    id: "base64",
    title: "Base64 编解码",
    summary: "支持中文内容的 Base64 编码与解码。",
    category: "dev",
    categoryLabel: "开发",
    mark: "64",
    searchTerms: ["base64", "编码", "解码", "文本"],
  },
  {
    id: "color",
    title: "颜色转换",
    summary: "将 HEX 颜色转换为 RGB 与 HSL。",
    category: "dev",
    categoryLabel: "开发",
    mark: "#",
    searchTerms: ["颜色", "hex", "rgb", "hsl", "color"],
  },
];

export const DEFAULT_RECENT: ToolId[] = [
  "json",
  "timestamp",
  "text-stats",
];

export function findTool(toolId: ToolId) {
  return TOOLS.find((tool) => tool.id === toolId);
}
