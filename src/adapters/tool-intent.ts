import type { ModuleLoader } from "../contracts/ports";
/** One disposable listener set covers cards added by filtering or navigation. */
export function observeToolIntent(
  target: Document,
  modules: Pick<ModuleLoader<unknown>, "preload">,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function card(node: EventTarget | null) {
    return node instanceof Element ? node.closest<HTMLElement>("a[data-tool-id]") : null;
  }
  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }
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
  function out(event: PointerEvent) {
    if (card(event.target) !== card(event.relatedTarget)) cancel();
  }
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
