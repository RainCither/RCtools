/** @file 应用根组件。输出 HTML 基础结构、提供目录数据、启动浏览器服务、挂载路由页面，并提供全局错误界面。 */
import type { ReactNode } from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Links, Outlet, Scripts, useLoaderData, useLocation } from "react-router";
import type { BrowserServices } from "../bindings/react/services";
import { ServicesProvider } from "../bindings/react/services";
import { CatalogProvider } from "./catalog-context";
import { catalogData } from "./catalog.server";
import "./globals.css";
/** 返回构建生成的目录描述数据，供根页面预渲染和客户端目录查询共用。 */
export function loader() {
  return catalogData;
}
/** 保持静态目录数据在导航期间稳定，避免每次工具切换重新取得相同构建数据。 */
export function shouldRevalidate() {
  return false;
}
/** 渲染文档基础结构与 children，统一 UTF-8、视口、图标和框架资源入口。 */
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
/** 提供目录与浏览器服务上下文，挂载当前路由页面，并在运行服务加载失败时显示恢复入口。 */
export default function App() {
  const data = useLoaderData<typeof loader>();
  const [services, setServices] = useState<BrowserServices | null>(null);
  const [failed, setFailed] = useState(false);
  const location = useLocation();
  // 浏览器能力在挂载后按需加载；清理标记阻止导入完成后初始化已离开的页面。
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
      // 页面拥有运行服务的生命周期，离开时释放最近使用订阅与预加载监听。
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
// 恢复组件只在错误页面需要时加载，减少首页初始脚本依赖。
const Recovery = lazy(() => import("./application-recovery"));
/** 渲染应用级错误页面与延迟加载的恢复组件，使页面故障仍能提供导航和诊断。 */
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
