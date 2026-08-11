/** 通过按需加载的 Prettier/PostCSS 与 CSSO 格式化或压缩 CSS。 */
const FORMAT_OPTIONS = {
  parser: "css",
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: "lf",
} as const;

let prettierPromise: Promise<typeof import("prettier/standalone")> | undefined;
let postcssPluginPromise: Promise<typeof import("prettier/plugins/postcss")> | undefined;
let cssoPromise: Promise<typeof import("csso")> | undefined;

/** 拒绝仅包含空白的 CSS 输入。 */
function requireCss(input: string) {
  if (!input.trim()) throw new Error("请输入 CSS 内容。");
}

/** 延迟加载并复用 Prettier standalone 模块。 */
function getPrettier() {
  prettierPromise ??= import("prettier/standalone");
  return prettierPromise;
}

/** 延迟加载并复用 Prettier 的 PostCSS 解析插件。 */
function getPostcssPlugin() {
  postcssPluginPromise ??= import("prettier/plugins/postcss");
  return postcssPluginPromise;
}

/** 延迟加载并复用 CSSO 压缩器。 */
function getCsso() {
  cssoPromise ??= import("csso");
  return cssoPromise;
}

/** 为底层解析错误补充当前操作上下文后重新抛出。 */
function withContext(prefix: string, cause: unknown): never {
  const detail = cause instanceof Error ? cause.message : "未知错误";
  throw new Error(`${prefix}：${detail}`);
}

/** 使用稳定的格式选项美化 CSS。 */
export async function formatCss(input: string): Promise<string> {
  requireCss(input);

  try {
    const [prettier, postcssPlugin] = await Promise.all([
      getPrettier(),
      getPostcssPlugin(),
    ]);
    return await prettier.format(input, {
      ...FORMAT_OPTIONS,
      plugins: [postcssPlugin],
    });
  } catch (cause) {
    withContext("CSS 格式化失败", cause);
  }
}

/** 使用 CSSO 删除注释并重构为紧凑 CSS。 */
export async function minifyCss(input: string): Promise<string> {
  requireCss(input);

  try {
    const { minify } = await getCsso();
    return minify(input, { comments: false, restructure: true }).css;
  } catch (cause) {
    withContext("CSS 压缩失败", cause);
  }
}
