import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Hides that this is Next.js
        { key: "X-Powered-By", value: "" },
      ],
    },
  ],
};

export default nextConfig;
