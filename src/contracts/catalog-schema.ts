import * as v from "valibot";
const nonempty = v.pipe(v.string(), v.trim(), v.minLength(1));
const id = v.pipe(nonempty, v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));
export const AppearanceSchema = v.strictObject({
  tone: v.optional(v.picklist(["accent", "blue", "green", "purple", "yellow", "teal"]), "accent"),
  size: v.optional(v.pipe(v.number(), v.minValue(12), v.maxValue(24)), 14),
  font: v.optional(v.picklist(["mono", "serif"]), "mono"),
});
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
export type ToolDescriptor = v.InferOutput<typeof ToolSchema> & { readonly kind: "tool" };
export type LinkDescriptor = v.InferOutput<typeof LinkSchema> & { readonly kind: "link" };
export type CatalogEntry = ToolDescriptor | LinkDescriptor;
