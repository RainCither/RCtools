/** 定义工具注册表共享的分类、元数据与懒加载契约。 */
import type { ComponentType } from "react";

/** 工具分类 id 对应的界面文案。 */
export const TOOL_CATEGORY_LABELS = {
  text: "文本",
  dev: "开发",
  date: "日期",
  other: "其他",
} as const;

/** 所有可注册的工具分类。 */
export type ToolCategory = keyof typeof TOOL_CATEGORY_LABELS;

/** 动态导入工具组件后期望得到的模块结构。 */
export type ToolComponentModule = { default: ComponentType };
/** 工具注册项使用的懒加载函数签名。 */
export type ToolLoader = () => Promise<ToolComponentModule>;

/** 首页、路由和懒加载共同消费的工具元数据。 */
export type ToolDefinition<
  TId extends string = string,
  TCategory extends ToolCategory = ToolCategory,
> = {
  id: TId;
  title: string;
  summary: string;
  category: TCategory;
  categoryLabel: (typeof TOOL_CATEGORY_LABELS)[TCategory];
  mark: string;
  searchTerms: readonly string[];
  load: ToolLoader;
};

/** 补全工具的分类文案，同时保留 id 和分类的字面量类型。 */
export function defineTool<
  const TId extends string,
  const TCategory extends ToolCategory,
>(
  definition: Omit<ToolDefinition<TId, TCategory>, "categoryLabel">,
): ToolDefinition<TId, TCategory> {
  return {
    ...definition,
    categoryLabel: TOOL_CATEGORY_LABELS[definition.category],
  };
}
