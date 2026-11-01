import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build gọn cho Docker (Coolify): .next/standalone/server.js
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["data/**/*"] },
  experimental: {
    // Phụ đề SRT của video dài có thể vượt giới hạn mặc định 1MB
    serverActions: { bodySizeLimit: "5mb" },
  },
  // Đường dẫn cũ của các game (tên tiếng Việt) → tên tiếng Anh
  redirects: async () => [
    { source: "/games/mua-tu-vung", destination: "/games/word-rain", permanent: true },
    { source: "/games/ong-danh-van", destination: "/games/spelling-bee", permanent: true },
  ],
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
