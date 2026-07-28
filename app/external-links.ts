import { TOOL_CATEGORY_LABELS, type ToolCategory } from "./tool-types";

export type ExternalLinkHref = `https://${string}` | `http://${string}`;

export type ExternalLinkDefinition<
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
  href: ExternalLinkHref;
};

export function defineExternalLink<
  const TId extends string,
  const TCategory extends ToolCategory,
>(
  definition: Omit<ExternalLinkDefinition<TId, TCategory>, "categoryLabel">,
): ExternalLinkDefinition<TId, TCategory> {
  return {
    ...definition,
    categoryLabel: TOOL_CATEGORY_LABELS[definition.category],
  };
}

export const EXTERNAL_LINKS = [
  // defineExternalLink({
  //   id: "example",
  //   title: "示例网站",
  //   summary: "一句话说明这个外部网站能解决什么问题。",
  //   category: "dev",
  //   mark: "E",
  //   searchTerms: ["示例", "example"],
  //   href: "https://example.com",
  // }),
] as const satisfies readonly ExternalLinkDefinition[];
