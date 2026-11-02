import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build gọn cho Docker (Coolify): .next/standalone/server.js
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["data/**/*"] },
  experimental: {
    // Phụ đề SRT của video dài có thể vượt giới hạn mặc định 1MB
    serverActions: { bodySizeLimit: "5mb" },
  },
  // Chưa có script-src: CSP theo nonce buộc mọi trang render động, không hợp với partialPrefetching
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
      ],
    },
  ],
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
