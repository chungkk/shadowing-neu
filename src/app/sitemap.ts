import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listLessons } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

/** sitemap.xml: trang chủ + mọi bài đã đăng (đọc DB lúc request — lúc build chưa có DB thật) */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/sprechen`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/games/mua-tu-vung`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/games/ong-danh-van`, changeFrequency: "monthly", priority: 0.6 },
    ...["/privacy", "/privacy/de", "/terms", "/terms/de"].map((p) => ({ url: SITE_URL + p, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...listLessons().map((l) => ({
      url: `${SITE_URL}/${l.slug}`,
      lastModified: new Date(l.createdAt.replace(" ", "T") + "Z"),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
