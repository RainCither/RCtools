/** @file 配置 quality/unit 目录内的单元测试，在 Node 环境运行。 */
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["quality/unit/**/*.test.ts"], environment: "node" },
});
