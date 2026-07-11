import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const basePath = process.env.PAGES_BASE_PATH ?? "/";
const customDomain =
  process.env.PAGES_CUSTOM_DOMAIN ?? "tool.raincither.top";

if (
  !basePath.startsWith("/") ||
  (basePath.length > 1 && basePath.endsWith("/"))
) {
  throw new Error("PAGES_BASE_PATH must start with / and must not end with /.");
}

const outputDirectory = resolve(import.meta.dirname, "dist");

export default defineConfig({
  base: basePath === "/" ? "/" : `${basePath}/`,
  plugins: [
    react(),
    {
      name: "github-pages-nojekyll",

      async closeBundle() {
        await Promise.all([
          writeFile(resolve(outputDirectory, ".nojekyll"), "", "utf8"),
          writeFile(
            resolve(outputDirectory, "CNAME"),
            `${customDomain}\n`,
            "utf8",
          ),
        ]);
      },
    },
  ],
  build: {
    emptyOutDir: true,
  },
});
