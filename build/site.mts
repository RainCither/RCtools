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
export const site = {
  basename: base === "/" ? "/" : `${base}/`,
  assetBase: base === "/" ? "/" : `${base}/`,
  domain,
  title: "工具匣｜常用小工具，一开即用",
  description: "常用小工具，一开即用。",
};
