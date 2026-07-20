"use client";

import { CodeTransformTool } from "../shared/code-transform-tool";
import { formatCss, minifyCss } from "./css-formatter-core";

const INITIAL_CSS = `.card{color:#ff0000;padding:12px 12px 12px 12px}.card:hover{color:rgb(0,128,0)}`;

export default function CssFormatterTool() {
  return (
    <CodeTransformTool
      idPrefix="css-formatter"
      languageLabel="CSS"
      initialValue={INITIAL_CSS}
      inputPlaceholder="粘贴标准 CSS 内容"
      outputPlaceholder="格式化或压缩后的 CSS"
      format={formatCss}
      minify={minifyCss}
    />
  );
}
