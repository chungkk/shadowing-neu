import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build gọn cho Docker (Coolify): .next/standalone/server.js
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["data/**/*"] },
  // API câu hỏi lái xe (app iOS/Android) đọc catalog JSON lúc chạy
  outputFileTracingIncludes: {
    "/api/fuehrerschein/**": ["./content/laixe/catalog/*.json", "./content/laixe/catalog_all/*.json"],
  },
  // Ảnh trên các trang giới thiệu của ckk.biz
  images: {
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/**" }],
  },
  experimental: {
    // Phụ đề SRT của video dài có thể vượt giới hạn mặc định 1MB
    serverActions: { bodySizeLimit: "5mb" },
    // 2 root layout (app học + trang doanh nghiệp) → trang 404 chung ở app/global-not-found.tsx
    globalNotFound: true,
  },
  // Chưa có script-src: CSP theo nonce buộc mọi trang render động, không hợp với partialPrefetching
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
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
