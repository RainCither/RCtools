import { createBrowserServices } from "../adapters/browser";
import { observeToolIntent } from "../adapters/tool-intent";
import { TOOL_LOADERS } from "../generated/tool-loaders";
import { WORKER_FACTORIES } from "../generated/worker-factories";
import type { CatalogEntry } from "../contracts/catalog-schema";
let current: ReturnType<typeof createBrowserServices> | undefined;
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
    dispose() {
      stopIntent();
      services.recent.dispose();
    },
  };
}
export function reportApplicationFailure() {
  current?.logger.emit({ level: "error", event: "app.render.failed", errorCode: "render.failed" });
}
export async function copyApplicationDiagnostics() {
  if (current) await current.clipboard.write(current.logger.diagnostics());
}
