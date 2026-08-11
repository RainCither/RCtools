/** 定义首页可展示的外部工具链接及其类型安全的元数据。 */
import { TOOL_CATEGORY_LABELS, type ToolCategory } from "./tool-types";

/** 仅允许显式 HTTP(S) 协议的外部地址。 */
export type ExternalLinkHref = `https://${string}` | `http://${string}`;

/** 首页外部链接卡片所需的完整元数据。 */
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

/** 补全外部链接的分类文案，同时保留字面量 id 与分类类型。 */
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

/** 实际展示的外部链接；新增条目时通过 defineExternalLink 注册。 */
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
