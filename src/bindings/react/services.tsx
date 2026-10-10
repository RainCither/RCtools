/** @file 定义 React 页面可使用的浏览器服务集合，通过 Context 注入服务，并提供必需或可选的服务读取方法。 */
import type { ComponentType, ReactNode } from "react";
import { createContext, useContext } from "react";
import type {
  ClipboardPort,
  ClockPort,
  ControllerPorts,
  ModuleLoader,
  RandomPort,
  RecentStore,
} from "../../contracts/ports";
/** 提供给 React 页面的浏览器能力集合，业务控制器通过接口调用而不直接依赖全局对象。 */
export type BrowserServices = ControllerPorts & {
  clipboard: ClipboardPort;
  clock: ClockPort;
  random: RandomPort;
  recent: RecentStore;
  files: { wrap(file: File): import("../../contracts/files").FileResource };
  modules: ModuleLoader<{ default: ComponentType }>;
};
export const ServicesContext = createContext<BrowserServices | null>(null);
/** 将 services 注入 children 的组件树，允许预渲染阶段暂时没有浏览器运行服务。 */
export function ServicesProvider({
  services,
  children,
}: {
  services: BrowserServices | null;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
/** 读取已激活的浏览器服务；缺少服务时明确失败，避免工具误用预渲染上下文。 */
export function useServices() {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("Browser services are not active.");
  return services;
}
/** 读取可空的浏览器服务，供首页或加载宿主兼容运行服务尚未启动的阶段。 */
export function useOptionalServices() {
  return useContext(ServicesContext);
}
