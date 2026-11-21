import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build gọn cho Docker (Coolify): .next/standalone/server.js
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["data/**/*"] },
  // API câu hỏi lái xe (app iOS/Android) đọc catalog JSON lúc chạy
  outputFileTracingIncludes: {
    "/api/fuehrerschein/**": ["./content/laixe/catalog/*.json", "./content/laixe/catalog_all/*.json"],
  },
  // Ảnh trên các trang giới thiệu của hallovn.de
  images: {
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/**" }],
  },
  experimental: {
    agentUpgrade: "security",
    // Phụ đề SRT của video dài có thể vượt giới hạn mặc định 1MB
    serverActions: { bodySizeLimit: "5mb" },
    // Root layout nằm trong route group (app) → trang 404 cho đường dẫn lạ ở app/global-not-found.tsx
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
    // Ảnh câu hỏi LiD có mã nội dung trong tên (q26.48d9065a.jpg) → cache lâu dài; huy hiệu bang (bw.png) ít khi đổi → 1 tuần
    { source: "/lid/:file(q[^/]+\\.[0-9a-f]{8}\\.jpg)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    { source: "/lid/wappen/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
  ],
  // Đường dẫn cũ của các game (tên tiếng Việt) → tên tiếng Anh
  redirects: async () => [
    { source: "/games/mua-tu-vung", destination: "/games/word-rain", permanent: true },
    { source: "/games/ong-danh-van", destination: "/games/spelling-bee", permanent: true },
    // Tab Lái xe: link cũ của chương / ôn câu sai
    { source: "/lai-xe/:c(\\d\\.\\d\\.\\d{2})", destination: "/lai-xe/hoc/:c", permanent: true },
    { source: "/lai-xe/on-tap", destination: "/lai-xe/cau-sai", permanent: true },
    // Bộ lọc kênh cũ ?channel=easy-german → trang kênh riêng
    { source: "/tieng-duc", has: [{ type: "query", key: "channel", value: "(?<ch>[a-z0-9-]+)" }], destination: "/tieng-duc/kenh/:ch", permanent: true },
    { source: "/leben-in-deutschland/on-tap", destination: "/leben-in-deutschland/cau-sai", permanent: true },
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
