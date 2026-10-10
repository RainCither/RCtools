/** @file 观察工具卡片的悬停和键盘焦点，提前预加载对应页面；负责取消计时器和释放事件监听。 */
import type { ModuleLoader } from "../contracts/ports";
/** 在 target 上委托监听工具卡片意图，调用 modules 预加载并返回统一清理函数；动态卡片共用监听。 */
export function observeToolIntent(
  target: Document,
  modules: Pick<ModuleLoader<unknown>, "preload">,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** 从事件目标 node 向上查找工具链接，供悬停与焦点事件共用卡片识别逻辑。 */
  function card(node: EventTarget | null) {
    return node instanceof Element ? node.closest<HTMLElement>("a[data-tool-id]") : null;
  }
  /** 撤销等待中的卡片预加载计时器，避免已经离开的悬停意图仍触发下载。 */
  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }
  /** 对鼠标或触控笔进入的新卡片延迟预加载，避免快速划过时触发多余下载。 */
  function over(event: PointerEvent) {
    const link = card(event.target);
    if (
      !link ||
      (event.pointerType !== "mouse" && event.pointerType !== "pen") ||
      link === card(event.relatedTarget)
    )
      return;
    cancel();
    const id = link.dataset.toolId;
    if (id)
      timer = setTimeout(() => {
        timer = undefined;
        modules.preload(id);
      }, 120);
  }
  /** 离开当前卡片时撤销等待中的预加载，卡片内部元素切换时保持原意图。 */
  function out(event: PointerEvent) {
    if (card(event.target) !== card(event.relatedTarget)) cancel();
  }
  /** 键盘焦点进入工具链接时立即预加载，使键盘访问获得与悬停相同的加载体验。 */
  function focus(event: FocusEvent) {
    const id = card(event.target)?.dataset.toolId;
    if (id) {
      cancel();
      modules.preload(id);
    }
  }
  target.addEventListener("pointerover", over);
  target.addEventListener("pointerout", out);
  target.addEventListener("focusin", focus);
  return () => {
    cancel();
    target.removeEventListener("pointerover", over);
    target.removeEventListener("pointerout", out);
    target.removeEventListener("focusin", focus);
  };
}
