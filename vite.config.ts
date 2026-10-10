/** @file 配置资源基础路径、CSS Modules 名称、Worker 模块格式、代码压缩和拆包；生成模块归属报告，并在开发时监听工具配置和入口变化。 */
import { reactRouter } from "@react-router/dev/vite";
import { fileURLToPath } from "node:url";
import { relative } from "node:path";
import { defineConfig } from "vite";
import { generateCatalog } from "./build/catalog.mts";
import { site } from "./build/site.mts";
export default defineConfig({
  base: site.assetBase,
  css: { modules: { generateScopedName: "rc_[hash:base64:6]" } },
  worker: { format: "es" },
  build: {
    minify: "terser",
    terserOptions: {
      ecma: 2022,
      compress: { passes: 3, drop_console: true },
      format: { comments: false },
    },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "app-shell",
              test: /(?:node_modules[\\/](?:react|react-dom|react-router|scheduler)[\\/]|src[\\/](?:app[\\/](?:root|entry\.client|catalog-context|routes[\\/]home)\.tsx|catalog[\\/]|generated[\\/]catalog\.ts|ui[\\/](?:mark\.tsx|shell-classes\.ts)|bindings[\\/]react[\\/]services\.tsx))/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  define: { __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA ?? "dev") },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [
    {
      name: "bundle-boundary-report",
      /** 在客户端构建完成时记录每个脚本块的源模块归属，供发布检查识别初始加载边界。 */
      generateBundle(_options, bundle) {
        if (this.environment.name !== "client") return;
        const report = Object.fromEntries(
          Object.entries(bundle)
            .filter(
              (entry): entry is [string, import("rolldown").OutputChunk] =>
                entry[1].type === "chunk",
            )
            .map(([file, chunk]) => [
              file,
              Object.keys(chunk.modules).map((id) =>
                relative(process.cwd(), id).replaceAll("\\", "/"),
              ),
            ]),
        );
        this.emitFile({
          type: "asset",
          fileName: "bundle-report.json",
          source: JSON.stringify(report),
        });
      },
    },
    {
      name: "tool-catalog-watch",
      /** 监听工具配置与入口变化并串行重新生成目录，在开发服务器关闭时移除监听。 */
      configureServer(server) {
        // 配置变化串行执行生成，避免快速保存时多个写入互相覆盖。
        let pending = Promise.resolve();
        /** 仅对相关 file 变化触发目录生成，成功刷新页面，校验失败则向开发界面报告问题。 */
        const regenerate = (file: string) => {
          if (
            !/[\\/]src[\\/](?:catalog[\\/].+\.json|tools[\\/][^\\/]+[\\/](?:tool\.json|view\.tsx|worker\.ts))$/.test(
              file,
            )
          )
            return;
          pending = pending.then(async () => {
            try {
              await generateCatalog();
              server.ws.send({ type: "full-reload" });
            } catch (error) {
              server.ws.send({
                type: "error",
                err: {
                  message: error instanceof Error ? error.message : "Invalid tool configuration",
                  stack: "",
                  plugin: "tool-catalog-watch",
                },
              });
            }
          });
        };
        server.watcher.on("add", regenerate).on("unlink", regenerate).on("change", regenerate);
        // 开发服务关闭时解绑文件监听，避免重复启动积累监听器。
        server.httpServer?.on("close", () => {
          server.watcher.off("add", regenerate).off("unlink", regenerate).off("change", regenerate);
        });
      },
    },
    reactRouter(),
  ],
});
