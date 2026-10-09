import { useEffect, useState, useSyncExternalStore } from "react";
import type { ToolController } from "../../contracts/ports";
export function useController<S, A>(factory: () => ToolController<S, A>) {
  const [controller] = useState(factory);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    controller.activate();
    return () => controller.dispose();
  }, [controller]);
  return { snapshot, actions: controller.actions, controller };
}
