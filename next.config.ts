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
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/apple-developer-merchantid-domain-association",
        destination: "/api/apple-pay-domain"
      }
    ];
  }
};

export default nextConfig;
