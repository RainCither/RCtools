/** @file useController() Hook。创建控制器、订阅状态快照，在组件挂载后激活控制器，在离开时释放。 */
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ToolController } from "../../contracts/ports";
/** 用 factory 创建当前组件的控制器，订阅快照并返回稳定 actions；激活和释放放在 effect 中。 */
export function useController<S, A>(factory: () => ToolController<S, A>) {
  // 使用惰性初始化保持当前实例的控制器引用稳定，避免每次重渲染重新创建。
  const [controller] = useState(factory);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  // 初始化过程不读浏览器状态；副作用与清理放在 effect 中，兼容 StrictMode 重复挂载。
  useEffect(() => {
    controller.activate();
    return () => controller.dispose();
  }, [controller]);
  return { snapshot, actions: controller.actions, controller };
}
