import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listLessons, listNewsPosts } from "@/lib/db";
import { chapterIds } from "@/lib/fuehrerschein";
import { setIds } from "@/lib/lid";
import { SITE_URL } from "@/lib/site";
import { lessonPath } from "@/lib/slug";
import { guidePath } from "@/lib/guides";
import { LEGAL_PRODUCTS, NOINDEX_LEGAL_SLUGS } from "@/biz/lib/legal";
import { PRODUCT_PAGES } from "@/biz/lib/productPages";
import { SERVICES, productPath } from "@/biz/lib/services";

// Trang doanh nghiệp / pháp lý (chuyển từ ckk-biz). lastmod chỉ ghi khi biết ngày sửa thật — cập nhật cùng LEGAL_UPDATED (src/biz/lib/site.ts)
const LEGAL_LASTMOD = new Date("2026-11-01");
const legal = (path: string, priority = 0.3) => ({ url: SITE_URL + path, lastModified: LEGAL_LASTMOD, changeFrequency: "yearly" as const, priority });
const bizPages = (): MetadataRoute.Sitemap => [
  { url: `${SITE_URL}/about`, changeFrequency: "weekly", priority: 0.8 },
  ...SERVICES.map((s) => ({
    url: SITE_URL + productPath(s),
    changeFrequency: "weekly" as const,
    priority: 0.8,
    images: PRODUCT_PAGES[s.id].screens.map((screen) => SITE_URL + screen.src),
  })),
  { url: `${SITE_URL}/support`, changeFrequency: "monthly", priority: 0.6 },
  ...["/privacy", "/terms", "/refund", "/delete-account"].map((p) => legal(p)),
  legal("/impressum", 0.2),
  ...LEGAL_PRODUCTS.filter((p) => !NOINDEX_LEGAL_SLUGS.has(p.slug)).flatMap((p) => [
    { url: `${SITE_URL}/${p.slug}/support`, changeFrequency: "monthly" as const, priority: 0.5 },
    legal(`/${p.slug}/privacy`),
  ]),
];

/** sitemap.xml: trang chủ + mọi bài đã đăng (đọc DB lúc request — lúc build chưa có DB thật) */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/tieng-duc`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/huong-dan`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/tin-tuc`, changeFrequency: "hourly", priority: 0.5 },
    ...listNewsPosts({ limit: 1000 }).map((p) => ({
      url: SITE_URL + guidePath(p.slug),
      lastModified: new Date(p.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/games/word-rain`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/games/spelling-bee`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/games/word-match`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/games/der-die-das`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/lai-xe`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/leben-in-deutschland`, changeFrequency: "monthly", priority: 0.9 },
    ...chapterIds().map((id) => ({ url: `${SITE_URL}/lai-xe/${id}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...setIds().map((id) => ({ url: `${SITE_URL}/leben-in-deutschland/${id}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...bizPages(),
    ...["/deutsch-shadowing/privacy", "/deutsch-shadowing/privacy/de", "/deutsch-shadowing/terms", "/deutsch-shadowing/terms/de"].map((p) => ({ url: SITE_URL + p, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...listLessons().map((l) => ({
      url: SITE_URL + lessonPath(l.slug),
      lastModified: new Date(l.createdAt.replace(" ", "T") + "Z"),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
