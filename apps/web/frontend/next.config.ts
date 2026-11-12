import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/login", destination: "/company/login", permanent: false },
      { source: "/forgot-password", destination: "/company/forgot-password", permanent: false },
      { source: "/reset-password", destination: "/company/reset-password", permanent: false },
    ];
  },
};

export default nextConfig;
