import type { Logger, ModuleLoader } from "../contracts/ports";
import { failure } from "../contracts/result";
export function createModuleLoader<T>(
  loaders: Readonly<Record<string, () => Promise<T>>>,
  logger: Logger,
): ModuleLoader<T> {
  const cache = new Map<string, Promise<T>>();
  function load(id: string): Promise<T> {
    const existing = cache.get(id);
    if (existing) return existing;
    const loader = loaders[id];
    if (!loader) return Promise.reject(failure("resource", "module.missing", "工具不存在。"));
    const promise = loader().catch(() => {
      cache.delete(id);
      throw failure("resource", "module.load", "工具资源加载失败，请重试。");
    });
    cache.set(id, promise);
    return promise;
  }
  return {
    load,
    preload(id) {
      void load(id).catch(() =>
        logger.emit({
          level: "warn",
          event: "module.preload.failed",
          toolId: id,
          errorCode: "module.load",
        }),
      );
    },
    reset(id) {
      cache.delete(id);
    },
  };
}
