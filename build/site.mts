/** @file 读取并校验 PAGES_BASE_PATH 和 PAGES_CUSTOM_DOMAIN，统一提供路由基础路径、资源基础路径、域名及站点描述。 */
const base = process.env.PAGES_BASE_PATH ?? "/";
if (!/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/.test(base))
  throw new Error(
    "PAGES_BASE_PATH must be / or a path such as /RCtools, without a trailing slash.",
  );
const domain = process.env.PAGES_CUSTOM_DOMAIN ?? "tool.raincither.top";
if (domain && !/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain))
  throw new Error(
    "PAGES_CUSTOM_DOMAIN must be an empty string or a domain without scheme or path.",
  );
// 路由、资源和预渲染共用带尾斜杠的基础路径，避免子路径部署出现双重前缀。
export const site = {
  basename: base === "/" ? "/" : `${base}/`,
  assetBase: base === "/" ? "/" : `${base}/`,
  domain,
  title: "工具匣｜常用小工具，一开即用",
  description: "常用小工具，一开即用。",
};
