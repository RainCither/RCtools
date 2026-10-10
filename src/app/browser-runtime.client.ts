/** @file 将生成的页面加载器和 Worker 工厂组装成浏览器运行服务；启动意图预加载监听，并提供全局故障记录和诊断复制入口。 */
import { createBrowserServices } from "../adapters/browser";
import { observeToolIntent } from "../adapters/tool-intent";
import { TOOL_LOADERS } from "../generated/tool-loaders";
import { WORKER_FACTORIES } from "../generated/worker-factories";
import type { CatalogEntry } from "../contracts/catalog-schema";
let current: ReturnType<typeof createBrowserServices> | undefined;
/** 依据 entries 装配生成的加载器和 Worker 工厂，返回服务及统一清理入口。 */
export function createBrowserRuntime(entries: readonly CatalogEntry[]) {
  current = createBrowserServices({
    workers: WORKER_FACTORIES,
    loaders: TOOL_LOADERS,
    ids: new Set(entries.map((entry) => entry.id)),
    excludedDrafts: new Set(
      entries
        .filter((entry) => entry.kind === "tool" && entry.draft === "none")
        .map((entry) => entry.id),
    ),
    buildId: __BUILD_ID__,
    development: import.meta.env.DEV,
  });
  const services = current;
  const stopIntent = observeToolIntent(document, services.modules);
  return {
    ...services,
    /** 解除卡片意图与最近使用的存储监听，避免运行服务在卸载后继续接收事件。 */
    dispose() {
      stopIntent();
      services.recent.dispose();
    },
  };
}
/** 向当前浏览器运行服务记录应用渲染失败，提供不包含业务内容的诊断事件。 */
export function reportApplicationFailure() {
  current?.logger.emit({ level: "error", event: "app.render.failed", errorCode: "render.failed" });
}
/** 从当前运行服务取得诊断文字并交给剪贴板，返回复制操作的完成结果。 */
export async function copyApplicationDiagnostics() {
  if (current) await current.clipboard.write(current.logger.diagnostics());
}
