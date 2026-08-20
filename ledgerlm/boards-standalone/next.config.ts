import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || undefined;
const allowedDevOrigins = ["127.0.0.1", process.env.REPLIT_DEV_DOMAIN].filter(
  (origin): origin is string => Boolean(origin),
);

const nextConfig: NextConfig = {
  basePath,
  allowedDevOrigins,
};

export default nextConfig;
