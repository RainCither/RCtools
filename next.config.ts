import type { NextConfig } from "next";

const basePath = process.env.PAGES_BASE_PATH ?? "";

if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
  throw new Error("PAGES_BASE_PATH must start with / and must not end with /.");
}

const nextConfig: NextConfig = {
  basePath,
  trailingSlash: Boolean(basePath),
};

export default nextConfig;
