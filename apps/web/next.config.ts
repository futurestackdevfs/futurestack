import type { NextConfig } from "next";

const BACKEND = process.env.API_URL ?? "http://localhost:3002";

const nextConfig: NextConfig = {
  // Dev-only: disables the RSC HMR cache that accumulates memory across
  // recompiles and can OOM long-lived `next dev` sessions. No effect in
  // production builds.
  experimental: {
    serverComponentsHmrCache: false,
    optimizePackageImports: ["swr", "react-markdown", "remark-gfm"],
    // Client-side Router Cache: reuse a prefetched/visited route's payload for
    // a while so back/forward and quick re-navigation don't refetch.
    staleTimes: { dynamic: 30, static: 300 },
  },
  compress: true,
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
  // The Content-Security-Policy is set per-request (with a nonce) in
  // `middleware.ts` — not here — so it can't be static. These are the headers
  // that are safe to pin statically for every route.
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        // Deprecated & can introduce XSS-filter bugs — disable it, rely on CSP.
        { key: "X-XSS-Protection", value: "0" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
