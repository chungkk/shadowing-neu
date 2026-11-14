import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { AI_BOTS } from "@/lib/crawl-guard";

/** robots.txt: cho index trang chủ + bài học, chặn trang cá nhân / quản trị / API; cấm hẳn bot AI / SEO hút dữ liệu */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/settings",
          "/vocab",
          "/leaderboard",
          "/login",
          "/register",
          "/forgot-password",
          // Trang làm bài / cá nhân của Lái xe & LiD (đã noindex) — bot không cần vào
          "/lai-xe/thi-thu/",
          "/lai-xe/de-mau/", // từng đề (trọn câu + đáp án); trang danh sách /lai-xe/de-mau vẫn index
          "/lai-xe/cau-sai",
          "/lai-xe/danh-dau",
          "/lai-xe/thong-ke",
          "/leben-in-deutschland/thi-thu/",
          "/leben-in-deutschland/cau-sai",
          "/leben-in-deutschland/danh-dau",
          "/leben-in-deutschland/thong-ke",
        ],
      },
      { userAgent: AI_BOTS, disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
