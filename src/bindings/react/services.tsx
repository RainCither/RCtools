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
export type BrowserServices = ControllerPorts & {
  clipboard: ClipboardPort;
  clock: ClockPort;
  random: RandomPort;
  recent: RecentStore;
  files: { wrap(file: File): import("../../contracts/files").FileResource };
  modules: ModuleLoader<{ default: ComponentType }>;
};
export const ServicesContext = createContext<BrowserServices | null>(null);
export function ServicesProvider({
  services,
  children,
}: {
  services: BrowserServices | null;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
export function useServices() {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("Browser services are not active.");
  return services;
}
export function useOptionalServices() {
  return useContext(ServicesContext);
}
