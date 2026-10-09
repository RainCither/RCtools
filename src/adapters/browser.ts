import type { ComponentType } from "react";
import type { WorkerFactory } from "../contracts/ports";
import { failure } from "../contracts/result";
import { createDraftStore } from "./drafts";
import { readFileBytes } from "./files";
import { createLogger } from "./logger";
import { createModuleLoader } from "./modules";
import { createRecentStore } from "./recent";
import { createTaskExecutor } from "./tasks";
export function createBrowserServices(options: {
  workers: Readonly<Record<string, WorkerFactory>>;
  loaders: Readonly<Record<string, () => Promise<{ default: ComponentType }>>>;
  ids: ReadonlySet<string>;
  excludedDrafts: ReadonlySet<string>;
  buildId: string;
  development: boolean;
}) {
  const clock = { now: () => Date.now(), monotonic: () => performance.now() };
  const logger = createLogger(
    clock,
    options.buildId,
    globalThis.crypto?.randomUUID?.() ?? `${clock.now()}-${clock.monotonic()}`,
    options.development,
  );
  const recent = createRecentStore(options.ids, () => window.localStorage, logger, {
    subscribe(listener) {
      const handler = (event: StorageEvent) => {
        if (event.key === "toolbox:recent:v1") listener();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  });
  return {
    clock,
    logger,
    recent,
    drafts: createDraftStore(16 * 1024 * 1024, options.excludedDrafts),
    tasks: createTaskExecutor(options.workers, logger, clock),
    modules: createModuleLoader(options.loaders, logger),
    files: {
      wrap(file: File) {
        return {
          name: file.name,
          size: file.size,
          read: (signal: import("../contracts/ports").CancellationSignal) =>
            readFileBytes(file, signal),
        };
      },
    },
    clipboard: {
      async write(text: string) {
        try {
          if (!navigator.clipboard)
            throw failure(
              "unsupported",
              "clipboard.unavailable",
              "复制功能不可用，请手动选择结果复制。",
            );
          await navigator.clipboard.writeText(text);
        } catch (error) {
          logger.emit({
            level: "warn",
            event: "clipboard.failed",
            errorCode: "clipboard.unavailable",
          });
          throw error;
        }
      },
    },
    random: {
      index(max: number) {
        if (!globalThis.crypto?.getRandomValues)
          throw failure(
            "unsupported",
            "random.unavailable",
            "浏览器不支持安全随机数，请使用 HTTPS 和现代浏览器。",
          );
        if (!Number.isInteger(max) || max < 1 || max > 0x1_0000_0000)
          throw new Error("Invalid random range");
        const limit = Math.floor(0x1_0000_0000 / max) * max;
        const value = new Uint32Array(1);
        do {
          crypto.getRandomValues(value);
        } while ((value[0] ?? 0) >= limit);
        return (value[0] ?? 0) % max;
      },
    },
  };
}
