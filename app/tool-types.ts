import type { ComponentType } from "react";

export const TOOL_CATEGORY_LABELS = {
  text: "文本",
  dev: "开发",
  date: "日期",
} as const;

export type ToolCategory = keyof typeof TOOL_CATEGORY_LABELS;

export type ToolComponentModule = { default: ComponentType };
export type ToolLoader = () => Promise<ToolComponentModule>;

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
