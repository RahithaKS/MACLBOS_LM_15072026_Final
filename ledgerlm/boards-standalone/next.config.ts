import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || undefined;
const replitDevDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
const replitProxyDomain =
  replitDevDomain?.replace(/\.replit\.dev$/, ".repl.co") || undefined;
const allowedDevOrigins = [
  "127.0.0.1",
  "localhost",
  replitDevDomain,
  replitProxyDomain,
].filter((origin): origin is string => Boolean(origin));

const nextConfig: NextConfig = {
  basePath,
  allowedDevOrigins,
};

export default nextConfig;
