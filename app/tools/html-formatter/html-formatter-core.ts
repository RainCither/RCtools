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

function requireHtml(input: string) {
  if (!input.trim()) throw new Error("请输入 HTML 内容。");
}

function getPrettier() {
  prettierPromise ??= import("prettier/standalone");
  return prettierPromise;
}

function getHtmlPlugin() {
  htmlPluginPromise ??= import("prettier/plugins/html");
  return htmlPluginPromise;
}

function getBabelPlugin() {
  babelPluginPromise ??= import("prettier/plugins/babel");
  return babelPluginPromise;
}

function getEstreePlugin() {
  estreePluginPromise ??= import("prettier/plugins/estree");
  return estreePluginPromise;
}

function getPostcssPlugin() {
  postcssPluginPromise ??= import("prettier/plugins/postcss");
  return postcssPluginPromise;
}

function getParse5() {
  parse5Promise ??= import("parse5");
  return parse5Promise;
}

function getCsso() {
  cssoPromise ??= import("csso");
  return cssoPromise;
}

function getTerser() {
  terserPromise ??= import("terser");
  return terserPromise;
}

function isElement(node: ChildNode): node is Element {
  return "tagName" in node;
}

function isTextNode(node: ChildNode): node is TextNode {
  return node.nodeName === "#text";
}

function isCommentNode(node: ChildNode): node is CommentNode {
  return node.nodeName === "#comment";
}

function getAttribute(element: Element, name: string) {
  return element.attrs.find((attribute) => attribute.name.toLowerCase() === name)?.value;
}

function isConditionalComment(comment: CommentNode) {
  return CONDITIONAL_COMMENT_PATTERN.test(comment.data);
}

function collapseTextWhitespace(value: string) {
  return value.replace(/[\t\n\f\r ]+/g, " ");
}

function getRawText(element: Element) {
  return element.childNodes.filter(isTextNode).map((node) => node.value).join("");
}

function replaceRawText(element: Element, value: string) {
  const textNode = element.childNodes.find(isTextNode);
  if (!textNode) return;
  textNode.value = value;
  element.childNodes = [textNode];
}

function isCssStyle(element: Element) {
  const type = (getAttribute(element, "type") ?? "").trim().toLowerCase();
  return type === "" || type === "text/css";
}

function getJavaScriptType(element: Element) {
  return (getAttribute(element, "type") ?? "").trim().toLowerCase();
}

function isInlineJavaScript(element: Element) {
  return !getAttribute(element, "src") && JAVASCRIPT_TYPES.has(getJavaScriptType(element));
}

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
