import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net"
      }
    ]
  },
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
