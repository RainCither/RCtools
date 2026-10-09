import { createOperationController } from "../../contracts/controller";
import type { ControllerPorts } from "../../contracts/ports";
export type Draft = { input: string };
export function createController(ports: ControllerPorts) {
  return createOperationController<Draft, string>({
    id: "html-formatter",
    initial: {
      input:
        '<!doctype html><html lang="zh-CN"><head><style>.card{color:#ff0000;padding:12px 12px 12px 12px}</style></head><body><main class="card">工具匣</main><script>const message="页面已加载";console.log(message)</script></body></html>',
    },
    empty: "",
    ports,
    restore: (value, initial) =>
      typeof value === "object" &&
      value !== null &&
      "input" in value &&
      typeof value.input === "string"
        ? { input: value.input }
        : initial,
  });
}
