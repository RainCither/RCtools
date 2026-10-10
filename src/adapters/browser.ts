/** @file 浏览器服务总装配入口。提供时钟、日志、最近使用、草稿、任务执行、模块加载、文件包装、剪贴板和安全随机索引。 */
import type { ComponentType } from "react";
import type { WorkerFactory } from "../contracts/ports";
import { failure } from "../contracts/result";
import { createDraftStore } from "./drafts";
import { readFileBytes } from "./files";
import { createLogger } from "./logger";
import { createModuleLoader } from "./modules";
import { createRecentStore } from "./recent";
import { createTaskExecutor } from "./tasks";
/** 根据 options 注入的加载器、工厂和策略装配浏览器能力，返回工具可共用的服务集合。 */
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
    /** 订阅最近使用存储键变化并返回事件解绑函数，让多个页面同步列表且可完整释放。 */
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
    // 草稿只保存在当前页面会话内，密码等配置排除项不会进入缓存。
    drafts: createDraftStore(16 * 1024 * 1024, options.excludedDrafts),
    tasks: createTaskExecutor(options.workers, logger, clock),
    modules: createModuleLoader(options.loaders, logger),
    files: {
      /** 将浏览器 File 包装为文件资源接口；页面只展示名称与大小，实际读取由可取消任务发起。 */
      wrap(file: File) {
        return {
          name: file.name,
          size: file.size,
          /** 按 signal 发起可取消文件读取，返回字节缓冲供任务转移到后台线程。 */
          read: (signal: import("../contracts/ports").CancellationSignal) =>
            readFileBytes(file, signal),
        };
      },
    },
    clipboard: {
      /** 将 text 写入剪贴板，能力不可用或写入失败时向调用方返回错误以显示复制反馈。 */
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
      /** 在 max 的合法范围内用 Web Crypto 抽取无偏整数，返回字符选择和洗牌可用的安全索引。 */
      index(max: number) {
        if (!globalThis.crypto?.getRandomValues)
          throw failure(
            "unsupported",
            "random.unavailable",
            "浏览器不支持安全随机数，请使用 HTTPS 和现代浏览器。",
          );
        if (!Number.isInteger(max) || max < 1 || max > 0x1_0000_0000)
          throw new Error("Invalid random range");
        // 拒绝采样丢弃不能均分到各索引的尾部区间，避免直接取模带来的概率偏差。
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
