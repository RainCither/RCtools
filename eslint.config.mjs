/** @file 配置代码规范检查。检查未使用变量、类型导入、非空断言和控制台使用等；排除生成目录和构建产物。 */
import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "tests/**", "src/generated/**", ".react-router/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts}"],
    rules: {
      "no-console": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { disallowTypeAnnotations: false }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  { files: ["src/adapters/logger.ts"], rules: { "no-console": "off" } },
);
