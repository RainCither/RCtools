export type JavaScriptMinifyMode = "mangle" | "preserve-names";

const FORMAT_OPTIONS = {
  parser: "babel",
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: "lf",
} as const;

const MODULE_SYNTAX_PATTERN =
  /(^|[;}\n\r])\s*(?:import\s+(?!\s*\()|import\s*(?:\{|\*|\.\s*meta\b)|export\s+(?:default\b|const\b|let\b|var\b|function\b|class\b|async\b)|export\s*(?:\{|\*))/m;
const IMPORT_META_PATTERN = /(^|[^\w$.])import\s*\.\s*meta\b/m;

let prettierPromise: Promise<typeof import("prettier/standalone")> | undefined;
let babelPluginPromise: Promise<typeof import("prettier/plugins/babel")> | undefined;
let estreePluginPromise: Promise<typeof import("prettier/plugins/estree")> | undefined;
let terserPromise: Promise<typeof import("terser")> | undefined;

function requireJavaScript(input: string) {
  if (!input.trim()) throw new Error("请输入 JavaScript 内容。");
}

function getPrettier() {
  prettierPromise ??= import("prettier/standalone");
  return prettierPromise;
}

function getBabelPlugin() {
  babelPluginPromise ??= import("prettier/plugins/babel");
  return babelPluginPromise;
}

function getEstreePlugin() {
  estreePluginPromise ??= import("prettier/plugins/estree");
  return estreePluginPromise;
}

function getTerser() {
  terserPromise ??= import("terser");
  return terserPromise;
}

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

function maskJavaScriptStringsAndComments(input: string) {
  let result = "";
  let state: "code" | "single" | "double" | "template" | "line-comment" | "block-comment" =
    "code";

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (state === "code") {
      if (character === "'") state = "single";
      else if (character === '"') state = "double";
      else if (character === "`") state = "template";
      else if (character === "/" && nextCharacter === "/") {
        state = "line-comment";
        result += " ";
        index += 1;
      } else if (character === "/" && nextCharacter === "*") {
        state = "block-comment";
        result += " ";
        index += 1;
      } else {
        result += character;
        continue;
      }
      result += " ";
      continue;
    }

    if (state === "line-comment") {
      if (character === "\n" || character === "\r") {
        state = "code";
        result += character;
      } else {
        result += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (character === "*" && nextCharacter === "/") {
        state = "code";
        result += "  ";
        index += 1;
      } else {
        result += character === "\n" || character === "\r" ? character : " ";
      }
      continue;
    }

    if (character === "\\") {
      result += " ";
      if (nextCharacter !== undefined) {
        result += nextCharacter === "\n" || nextCharacter === "\r" ? nextCharacter : " ";
        index += 1;
      }
      continue;
    }

    const closesString =
      (state === "single" && character === "'") ||
      (state === "double" && character === '"') ||
      (state === "template" && character === "`");
    if (closesString) state = "code";
    result += character === "\n" || character === "\r" ? character : " ";
  }

  return result;
}

async function parseWithTerser(input: string, module: boolean) {
  const { minify } = await getTerser();
  await minify(input, {
    compress: false,
    mangle: false,
    module,
    format: { comments: true },
  });
}

export async function detectJavaScriptModule(input: string): Promise<boolean> {
  const maskedInput = maskJavaScriptStringsAndComments(input);
  if (MODULE_SYNTAX_PATTERN.test(maskedInput) || IMPORT_META_PATTERN.test(maskedInput)) {
    try {
      await parseWithTerser(input, true);
      return true;
    } catch (cause) {
      throw syntaxError(cause);
    }
  }

  let scriptError: unknown;
  try {
    await parseWithTerser(input, false);
    return false;
  } catch (cause) {
    scriptError = cause;
  }

  try {
    await parseWithTerser(input, true);
    return true;
  } catch (moduleError) {
    throw syntaxError(moduleError ?? scriptError);
  }
}

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
