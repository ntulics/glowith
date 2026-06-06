import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent webpack from bundling Prisma — load it from node_modules at runtime
  // so schema changes (prisma generate) take effect without a webpack cache bust.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
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
