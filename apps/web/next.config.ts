import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/student",
        destination: "/students",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
