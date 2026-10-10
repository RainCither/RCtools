/** @file 用 Valibot 定义工具、外链、分类和图标外观的校验规则，并导出相应 TypeScript 类型；主要用于构建阶段校验配置。 */
import * as v from "valibot";
const nonempty = v.pipe(v.string(), v.trim(), v.minLength(1));
const id = v.pipe(nonempty, v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));
export const AppearanceSchema = v.strictObject({
  tone: v.optional(v.picklist(["accent", "blue", "green", "purple", "yellow", "teal"]), "accent"),
  size: v.optional(v.pipe(v.number(), v.minValue(12), v.maxValue(24)), 14),
  font: v.optional(v.picklist(["mono", "serif"]), "mono"),
});
// 工具与外链共用描述字段；严格对象校验阻止把实现路径或脚本塞入配置。
const fields = {
  id,
  title: nonempty,
  summary: nonempty,
  category: id,
  mark: nonempty,
  searchTerms: v.array(nonempty),
  order: v.pipe(v.number(), v.integer()),
  appearance: v.optional(AppearanceSchema, { tone: "accent", size: 14, font: "mono" }),
};
export const ToolSchema = v.strictObject({
  ...fields,
  draft: v.optional(v.picklist(["session", "none"]), "session"),
});
export const LinkSchema = v.strictObject({
  ...fields,
  href: v.pipe(v.string(), v.url(), v.regex(/^https?:\/\//)),
});
export const CategorySchema = v.strictObject({ id, label: nonempty });
/** 经过 Schema 校验的本地工具描述，包含草稿策略与目录外观信息。 */
export type ToolDescriptor = v.InferOutput<typeof ToolSchema> & { readonly kind: "tool" };
/** 经过 Schema 校验的外链描述，href 只接受 HTTP(S) 地址。 */
export type LinkDescriptor = v.InferOutput<typeof LinkSchema> & { readonly kind: "link" };
/** 工具与外链的描述联合，通过 kind 区分本地计算入口和外部网址。 */
export type CatalogEntry = ToolDescriptor | LinkDescriptor;
