import { defineTool } from "../../tool-types";

export const jsonToolConfig = defineTool({
  id: "json",
  title: "JSON 格式化",
  summary: "校验、格式化或压缩 JSON 数据。",
  category: "dev",
  mark: "{ }",
  searchTerms: ["json", "格式化", "压缩", "校验"],
  load: () => import("./json-tool"),
});
