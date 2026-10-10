/** @file 工具页面模块加载器。缓存成功或正在进行的加载，支持预加载和清除缓存；加载失败后允许重新尝试。 */
import type { Logger, ModuleLoader } from "../contracts/ports";
import { failure } from "../contracts/result";
/** 为 loaders 建立按 ID 缓存的异步加载器，返回加载、意图预加载和失败后重试所需的方法。 */
export function createModuleLoader<T>(
  loaders: Readonly<Record<string, () => Promise<T>>>,
  logger: Logger,
): ModuleLoader<T> {
  const cache = new Map<string, Promise<T>>();
  /** 按 id 获取或复用正在加载的模块；失败时删除缓存并返回统一资源错误，以便再次尝试。 */
  function load(id: string): Promise<T> {
    const existing = cache.get(id);
    if (existing) return existing;
    const loader = loaders[id];
    if (!loader) return Promise.reject(failure("resource", "module.missing", "工具不存在。"));
    const promise = loader().catch(() => {
      // 失败 Promise 不能常驻缓存，否则用户重试仍会得到同一次拒绝。
      cache.delete(id);
      throw failure("resource", "module.load", "工具资源加载失败，请重试。");
    });
    cache.set(id, promise);
    return promise;
  }
  return {
    load,
    /** 按 id 提前加载工具模块并接住拒绝结果，预加载失败只记录诊断，不中断当前页面。 */
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
    /** 移除 id 的模块加载缓存，让下一次显式重试重新执行导入。 */
    reset(id) {
      cache.delete(id);
    },
  };
}
