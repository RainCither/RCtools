/** @file 借助 Prettier 与 Terser 校验、格式化或压缩标准 JavaScript。 */
/** 压缩时是否允许 Terser 缩短标识符名称。 */
export type JavaScriptMinifyMode = "mangle" | "preserve-names";

const FORMAT_OPTIONS = {
  parser: "babel",
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: "lf",
} as const;

let prettierPromise: Promise<typeof import("prettier/standalone")> | undefined;
let babelPluginPromise: Promise<typeof import("prettier/plugins/babel")> | undefined;
let estreePluginPromise: Promise<typeof import("prettier/plugins/estree")> | undefined;
let terserPromise: Promise<typeof import("terser")> | undefined;

/** 拒绝仅包含空白的 JavaScript 输入。 */
function requireJavaScript(input: string) {
  if (!input.trim()) throw new Error("请输入 JavaScript 内容。");
}

/** 延迟加载并复用 Prettier standalone 模块。 */
function getPrettier() {
  prettierPromise ??= import("prettier/standalone");
  return prettierPromise;
}

/** 延迟加载并复用 Prettier 的 Babel 解析插件。 */
function getBabelPlugin() {
  babelPluginPromise ??= import("prettier/plugins/babel");
  return babelPluginPromise;
}

/** 延迟加载并复用 Prettier 的 ESTree 打印插件。 */
function getEstreePlugin() {
  estreePluginPromise ??= import("prettier/plugins/estree");
  return estreePluginPromise;
}

/** 延迟加载并复用 Terser。 */
function getTerser() {
  terserPromise ??= import("terser");
  return terserPromise;
}

/** 将解析器异常转换为带行列信息和输入限制的错误。 */
function syntaxError(cause: unknown): Error {
  const details = cause as { message?: unknown; line?: unknown; col?: unknown };
  const message = typeof details?.message === "string" ? details.message : "语法无效";
  const location =
    typeof details?.line === "number"
      ? `（第 ${details.line} 行${typeof details.col === "number" ? `，第 ${details.col + 1} 列` : ""}）`
      : "";
  return new Error(
    `JavaScript 语法无效${location}：${message}。仅支持标准 JavaScript，不支持 JSX 或 TypeScript。`,
  );
}

type SyntaxNode = { type: string; [key: string]: unknown };
const FUNCTION_NODE_TYPES = new Set([
  "FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression",
  "ObjectMethod", "ClassMethod", "ClassPrivateMethod",
]);

function isSyntaxNode(value: unknown): value is SyntaxNode {
  return typeof value === "object" && value !== null &&
    "type" in value && typeof value.type === "string";
}

/** 仅识别实际语法节点；字符串、注释与正则字面量不能改变解析模式。 */
function containsModuleSyntax(ast: unknown) {
  const pending = [{ value: ast, functionDepth: 0 }];
  while (pending.length) {
    const { value, functionDepth } = pending.pop()!;
    if (!isSyntaxNode(value)) continue;
    if (value.type === "ImportDeclaration" || value.type.startsWith("Export")) return true;
    if (value.type === "MetaProperty" && isSyntaxNode(value.meta) &&
      value.meta.name === "import" && isSyntaxNode(value.property) &&
      value.property.name === "meta") return true;
    if (functionDepth === 0 && (value.type === "AwaitExpression" ||
      (value.type === "ForOfStatement" && value.await === true))) return true;

    const nextDepth = functionDepth + Number(FUNCTION_NODE_TYPES.has(value.type));
    for (const [key, child] of Object.entries(value)) {
      if (key === "comments" || key.endsWith("Comments") || key === "tokens") continue;
      // 方法的计算属性名在外层执行，不能当作函数体内的 await。
      const childDepth = key === "key" && value.type.endsWith("Method")
        ? functionDepth : nextDepth;
      for (const node of Array.isArray(child) ? child : [child]) {
        if (isSyntaxNode(node)) pending.push({ value: node, functionDepth: childDepth });
      }
    }
  }
  return false;
}

/** 让 Terser 以脚本或模块模式执行一次纯语法解析。 */
async function parseWithTerser(input: string, module: boolean) {
  const { minify } = await getTerser();
  await minify(input, {
    compress: false,
    mangle: false,
    module,
    format: { comments: true },
  });
}

/** 探测输入应按经典脚本还是 ES Module 解析。 */
export async function detectJavaScriptModule(input: string): Promise<boolean> {
  try {
    const babelPlugin = await getBabelPlugin();
    // Babel 的 standalone 解析入口只需源码，不依赖 Prettier 的打印选项。
    const parse = babelPlugin.parsers.babel.parse as (text: string) => unknown;
    const module = containsModuleSyntax(await parse(input));
    await parseWithTerser(input, module);
    return module;
  } catch (cause) {
    throw syntaxError(cause);
  }
}

/** 校验语法后使用 Prettier 格式化 JavaScript。 */
export async function formatJavaScript(input: string): Promise<string> {
  requireJavaScript(input);

  await detectJavaScriptModule(input);
  try {
    const [prettier, babelPlugin, estreePlugin] = await Promise.all([
      getPrettier(),
      getBabelPlugin(),
      getEstreePlugin(),
    ]);
    return await prettier.format(input, {
      ...FORMAT_OPTIONS,
      plugins: [babelPlugin, estreePlugin],
    });
  } catch (cause) {
    throw syntaxError(cause);
  }
}

/** 按是否改写标识符名称的选项压缩 JavaScript。 */
export async function minifyJavaScript(
  input: string,
  mode: JavaScriptMinifyMode,
): Promise<string> {
  requireJavaScript(input);

  const module = await detectJavaScriptModule(input);
  try {
    const { minify } = await getTerser();
    const result = await minify(input, {
      compress: true,
      mangle: mode === "mangle",
      module,
      format: { comments: false },
    });
    if (typeof result.code !== "string") throw new Error("压缩器没有返回结果");
    return result.code;
  } catch (cause) {
    throw syntaxError(cause);
  }
}
