/** 将 HTML 转换核心接入通用代码格式化界面。 */
import { CodeTransformTool } from "../shared/code-transform-tool";
import { formatHtml, minifyHtml } from "./html-formatter-core";

const INITIAL_HTML = `<!doctype html><html lang="zh-CN"><head><style>.card{color:#ff0000;padding:12px 12px 12px 12px}</style></head><body><main class="card">工具匣</main><script>const message="页面已加载";console.log(message)</script></body></html>`;

/** 渲染包含内嵌样式和脚本示例的 HTML 转换工具。 */
export default function HtmlFormatterTool() {
  return (
    <CodeTransformTool
      idPrefix="html-formatter"
      languageLabel="HTML"
      initialValue={INITIAL_HTML}
      inputPlaceholder="粘贴标准 HTML 文档或片段"
      outputPlaceholder="格式化或压缩后的 HTML"
      format={formatHtml}
      minify={minifyHtml}
    />
  );
}
