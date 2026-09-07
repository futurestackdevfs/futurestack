import type { NextConfig } from "next";

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

const nextConfig: NextConfig = {
  // Dev-only: disables the RSC HMR cache that accumulates memory across
  // recompiles and can OOM long-lived `next dev` sessions. No effect in
  // production builds.
  experimental: {
    serverComponentsHmrCache: false,
    optimizePackageImports: ["swr", "react-markdown", "remark-gfm"],
  },
  compress: true,
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Powered-By", value: "" },
      ],
    },
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${BACKEND}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
