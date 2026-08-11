/** 注册使用浏览器安全随机源的密码生成工具。 */
import { defineTool } from "../../tool-types";

/** 密码生成工具的首页元数据与懒加载入口。 */
export const passwordToolConfig = defineTool({
  id: "password",
  title: "密码生成",
  summary: "按长度与字符规则生成随机密码。",
  category: "dev",
  mark: "✦",
  searchTerms: ["密码", "随机", "password", "安全"],
  load: () => import("./password-tool"),
});
