import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** robots.txt: cho index trang chủ + bài học, chặn trang cá nhân / quản trị / API */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/settings", "/vocab", "/leaderboard", "/login", "/register", "/forgot-password"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
