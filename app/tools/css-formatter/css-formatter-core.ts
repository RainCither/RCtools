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

function requireCss(input: string) {
  if (!input.trim()) throw new Error("请输入 CSS 内容。");
}

function getPrettier() {
  prettierPromise ??= import("prettier/standalone");
  return prettierPromise;
}

function getPostcssPlugin() {
  postcssPluginPromise ??= import("prettier/plugins/postcss");
  return postcssPluginPromise;
}

function getCsso() {
  cssoPromise ??= import("csso");
  return cssoPromise;
}

function withContext(prefix: string, cause: unknown): never {
  const detail = cause instanceof Error ? cause.message : "未知错误";
  throw new Error(`${prefix}：${detail}`);
}

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

export async function minifyCss(input: string): Promise<string> {
  requireCss(input);

  try {
    const { minify } = await getCsso();
    return minify(input, { comments: false, restructure: true }).css;
  } catch (cause) {
    withContext("CSS 压缩失败", cause);
  }
}
