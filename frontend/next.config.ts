import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* to the Spring Boot HR backend (no CORS issues)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
