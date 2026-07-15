import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  turbopack: { root: process.cwd() },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
