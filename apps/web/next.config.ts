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
    // Serve modern formats and let the browser/CDN keep optimized copies for a
    // month — remote catalog thumbnails rarely change.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
    // Still permissive on host (avatars / blog / stock come from many domains);
    // `SafeImage` degrades gracefully when a specific URL can't be optimized.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
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
