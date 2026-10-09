import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["quality/unit/**/*.test.ts"], environment: "node" },
});
