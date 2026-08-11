/** 格式化或保守压缩 HTML，并按类型处理内嵌 CSS 与 JavaScript。 */
import type { DefaultTreeAdapterTypes } from "parse5";

type ParentNode = DefaultTreeAdapterTypes.ParentNode;
type ChildNode = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;
type TextNode = DefaultTreeAdapterTypes.TextNode;
type CommentNode = DefaultTreeAdapterTypes.CommentNode;

const FORMAT_OPTIONS = {
  parser: "html",
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: "lf",
} as const;

const DOCUMENT_PATTERN = /<!(?:doctype)\b|<(?:html|head|body)(?:\s|>)/i;
const CONDITIONAL_COMMENT_PATTERN = /^\s*\[if\b[\s\S]*<!\[endif\]\s*$/i;
const WHITESPACE_SENSITIVE_ELEMENTS = new Set(["pre", "textarea"]);
const JAVASCRIPT_TYPES = new Set([
  "",
  "text/javascript",
  "application/javascript",
  "text/ecmascript",
  "application/ecmascript",
  "module",
]);

let prettierPromise: Promise<typeof import("prettier/standalone")> | undefined;
let htmlPluginPromise: Promise<typeof import("prettier/plugins/html")> | undefined;
let babelPluginPromise: Promise<typeof import("prettier/plugins/babel")> | undefined;
let estreePluginPromise: Promise<typeof import("prettier/plugins/estree")> | undefined;
let postcssPluginPromise: Promise<typeof import("prettier/plugins/postcss")> | undefined;
let parse5Promise: Promise<typeof import("parse5")> | undefined;
let cssoPromise: Promise<typeof import("csso")> | undefined;
let terserPromise: Promise<typeof import("terser")> | undefined;

/** 拒绝仅包含空白的 HTML 输入。 */
function requireHtml(input: string) {
  if (!input.trim()) throw new Error("请输入 HTML 内容。");
}

/** 延迟加载并复用 Prettier standalone 模块。 */
function getPrettier() {
  prettierPromise ??= import("prettier/standalone");
  return prettierPromise;
}

/** 延迟加载并复用 Prettier 的 HTML 插件。 */
function getHtmlPlugin() {
  htmlPluginPromise ??= import("prettier/plugins/html");
  return htmlPluginPromise;
}

/** 延迟加载并复用内嵌脚本所需的 Babel 插件。 */
function getBabelPlugin() {
  babelPluginPromise ??= import("prettier/plugins/babel");
  return babelPluginPromise;
}

/** 延迟加载并复用内嵌脚本所需的 ESTree 插件。 */
function getEstreePlugin() {
  estreePluginPromise ??= import("prettier/plugins/estree");
  return estreePluginPromise;
}

/** 延迟加载并复用内嵌样式所需的 PostCSS 插件。 */
function getPostcssPlugin() {
  postcssPluginPromise ??= import("prettier/plugins/postcss");
  return postcssPluginPromise;
}

/** 延迟加载并复用 HTML5 解析与序列化器。 */
function getParse5() {
  parse5Promise ??= import("parse5");
  return parse5Promise;
}

/** 延迟加载并复用内嵌 CSS 压缩器。 */
function getCsso() {
  cssoPromise ??= import("csso");
  return cssoPromise;
}

/** 延迟加载并复用内嵌 JavaScript 压缩器。 */
function getTerser() {
  terserPromise ??= import("terser");
  return terserPromise;
}

/** 判断 parse5 子节点是否为元素节点。 */
function isElement(node: ChildNode): node is Element {
  return "tagName" in node;
}

/** 判断 parse5 子节点是否为文本节点。 */
function isTextNode(node: ChildNode): node is TextNode {
  return node.nodeName === "#text";
}

/** 判断 parse5 子节点是否为注释节点。 */
function isCommentNode(node: ChildNode): node is CommentNode {
  return node.nodeName === "#comment";
}

/** 不区分大小写地读取指定 HTML 属性。 */
function getAttribute(element: Element, name: string) {
  return element.attrs.find((attribute) => attribute.name.toLowerCase() === name)?.value;
}

/** 识别压缩时必须保留的旧版条件注释。 */
function isConditionalComment(comment: CommentNode) {
  return CONDITIONAL_COMMENT_PATTERN.test(comment.data);
}

/** 将普通文本节点中的连续 HTML 空白折叠为单个空格。 */
function collapseTextWhitespace(value: string) {
  return value.replace(/[\t\n\f\r ]+/g, " ");
}

/** 拼接元素直属文本节点中的原始代码内容。 */
function getRawText(element: Element) {
  return element.childNodes.filter(isTextNode).map((node) => node.value).join("");
}

/** 用压缩结果替换元素的直属文本内容。 */
function replaceRawText(element: Element, value: string) {
  const textNode = element.childNodes.find(isTextNode);
  if (!textNode) return;
  textNode.value = value;
  element.childNodes = [textNode];
}

/** 判断 style 元素是否包含可由 CSSO 处理的 CSS。 */
function isCssStyle(element: Element) {
  const type = (getAttribute(element, "type") ?? "").trim().toLowerCase();
  return type === "" || type === "text/css";
}

/** 规范化 script 元素的 type 属性。 */
function getJavaScriptType(element: Element) {
  return (getAttribute(element, "type") ?? "").trim().toLowerCase();
}

/** 判断脚本是否为无 src 且类型受支持的内嵌 JavaScript。 */
function isInlineJavaScript(element: Element) {
  return !getAttribute(element, "src") && JAVASCRIPT_TYPES.has(getJavaScriptType(element));
}

/** 压缩单个可处理的内嵌 style 元素。 */
async function minifyStyleElement(element: Element) {
  const source = getRawText(element);
  if (!source.trim()) return;

  try {
    const { minify } = await getCsso();
    replaceRawText(element, minify(source, { comments: false, restructure: true }).css);
  } catch (cause) {
    const details = cause instanceof Error ? cause.message : "未知错误";
    throw new Error(`HTML 内嵌 CSS 压缩失败：${details}`);
  }
}

/** 压缩单个可处理的内嵌 script 元素并保留标识符名称。 */
async function minifyScriptElement(element: Element) {
  const source = getRawText(element);
  if (!source.trim()) return;

  try {
    const { minify } = await getTerser();
    const result = await minify(source, {
      compress: true,
      mangle: false,
      module: getJavaScriptType(element) === "module",
      format: { comments: false },
    });
    if (typeof result.code !== "string") throw new Error("压缩器没有返回结果");
    replaceRawText(element, result.code);
  } catch (cause) {
    const details = cause instanceof Error ? cause.message : "未知错误";
    throw new Error(`HTML 内嵌 JavaScript 压缩失败：${details}`);
  }
}

/** 递归移除普通注释、折叠文本并压缩安全的内嵌资源。 */
async function minifyTree(parent: ParentNode): Promise<void> {
  const retainedChildren: ChildNode[] = [];

  for (const child of parent.childNodes) {
    if (isCommentNode(child)) {
      if (isConditionalComment(child)) retainedChildren.push(child);
      continue;
    }

    if (isTextNode(child)) {
      child.value = collapseTextWhitespace(child.value);
      retainedChildren.push(child);
      continue;
    }

    if (isElement(child)) {
      if (WHITESPACE_SENSITIVE_ELEMENTS.has(child.tagName)) {
        // Keep the complete subtree, including comments, exactly as parse5 read it.
      } else if (child.tagName === "style") {
        if (isCssStyle(child)) await minifyStyleElement(child);
      } else if (child.tagName === "script") {
        if (isInlineJavaScript(child)) await minifyScriptElement(child);
      } else {
        await minifyTree(child);
      }

      if (child.tagName === "template" && "content" in child) {
        await minifyTree(child.content);
      }
    }

    retainedChildren.push(child);
  }

  parent.childNodes = retainedChildren;
}

/** 使用 Prettier 统一格式化完整文档或 HTML 片段。 */
export async function formatHtml(input: string): Promise<string> {
  requireHtml(input);

  try {
    const [prettier, htmlPlugin, babelPlugin, estreePlugin, postcssPlugin] =
      await Promise.all([
        getPrettier(),
        getHtmlPlugin(),
        getBabelPlugin(),
        getEstreePlugin(),
        getPostcssPlugin(),
      ]);
    return await prettier.format(input, {
      ...FORMAT_OPTIONS,
      plugins: [
        htmlPlugin,
        babelPlugin,
        estreePlugin,
        postcssPlugin,
      ],
    });
  } catch (cause) {
    const details = cause instanceof Error ? cause.message : "未知错误";
    throw new Error(`HTML 格式化失败：${details}`);
  }
}

/** 通过 parse5 保守压缩文档/片段，并序列化为有效 HTML。 */
export async function minifyHtml(input: string): Promise<string> {
  requireHtml(input);

  try {
    const parse5 = await getParse5();
    const root = DOCUMENT_PATTERN.test(input) ? parse5.parse(input) : parse5.parseFragment(input);
    await minifyTree(root);
    return parse5.serialize(root);
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith("HTML 内嵌")) throw cause;
    const details = cause instanceof Error ? cause.message : "未知错误";
    throw new Error(`HTML 压缩失败：${details}`);
  }
}
