import type { ReactNode } from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Links, Outlet, Scripts, useLoaderData, useLocation } from "react-router";
import type { BrowserServices } from "../bindings/react/services";
import { ServicesProvider } from "../bindings/react/services";
import { CatalogProvider } from "./catalog-context";
import { catalogData } from "./catalog.server";
import "./globals.css";
export function loader() {
  return catalogData;
}
export function shouldRevalidate() {
  return false;
}
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f66b4f" />
        <link rel="icon" href={`${import.meta.env.BASE_URL}favicon.svg`} />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
export default function App() {
  const data = useLoaderData<typeof loader>();
  const [services, setServices] = useState<BrowserServices | null>(null);
  const [failed, setFailed] = useState(false);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    let current: (BrowserServices & { dispose(): void }) | undefined;
    void import("./browser-runtime.client")
      .then((module) => {
        if (!active) return;
        current = module.createBrowserRuntime(data.entries);
        current.recent.activate();
        setServices(current);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      current?.dispose();
    };
  }, [data]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);
  if (failed)
    return (
      <main>
        <h1>浏览器运行模块加载失败</h1>
        <p>请刷新页面后重试。</p>
        <a href={import.meta.env.BASE_URL}>重新打开工具匣</a>
      </main>
    );
  return (
    <CatalogProvider data={data}>
      <ServicesProvider services={services}>
        <Outlet />
      </ServicesProvider>
    </CatalogProvider>
  );
}
const Recovery = lazy(() => import("./application-recovery"));
export function ErrorBoundary() {
  return (
    <main>
      <h1>页面暂时无法显示</h1>
      <p>请重新打开工具匣。</p>
      <a href={import.meta.env.BASE_URL}>返回首页</a>
      <Suspense fallback={null}>
        <Recovery />
      </Suspense>
    </main>
  );
}
