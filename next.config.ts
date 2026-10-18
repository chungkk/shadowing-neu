import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build gọn cho Docker (Coolify): .next/standalone/server.js
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["data/**/*"] },
  experimental: {
    // Phụ đề SRT của video dài có thể vượt giới hạn mặc định 1MB
    serverActions: { bodySizeLimit: "5mb" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
