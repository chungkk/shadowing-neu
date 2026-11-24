import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { accessOf } from "@/lib/access";
import { listLessons } from "@/lib/db";
import { listDecks } from "@/lib/decks";
import { ALL_GRAMMAR_LESSONS } from "@/lib/grammar";
import { CHANNEL_MIN_INDEX, activeLessonLevels, lessonChannels, levelCatalogPath } from "@/lib/lesson-seo";
import { LID_UPDATED } from "@/lib/lid";
import { SITE_URL } from "@/lib/site";
import { channelPath, lessonPath } from "@/lib/slug";
import { LEGAL_PRODUCTS, NOINDEX_LEGAL_SLUGS } from "@/lib/company/legal";
import { PRODUCT_PAGES } from "@/lib/company/productPages";
import { SERVICES, productPath } from "@/lib/company/services";

// Trang doanh nghiệp / pháp lý (chuyển từ ckk-biz). lastmod chỉ ghi khi biết ngày sửa thật — cập nhật cùng LEGAL_UPDATED (src/lib/company/site.ts)
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
  ...["/privacy", "/terms", "/refund"].map((p) => legal(p)),
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
    ...activeLessonLevels().map(({ info }) => ({
      url: SITE_URL + levelCatalogPath(info.level),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...lessonChannels()
      .filter((c) => c.count >= CHANNEL_MIN_INDEX)
      .map((c) => ({ url: SITE_URL + channelPath(c.name), changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/ngu-phap`, changeFrequency: "monthly", priority: 0.85 },
    ...ALL_GRAMMAR_LESSONS.map((l) => ({
      url: `${SITE_URL}/ngu-phap/${l.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    { url: `${SITE_URL}/vocab`, changeFrequency: "monthly", priority: 0.8 },
    ...listDecks().map((d) => ({ url: `${SITE_URL}/vocab/decks/${d.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/lai-xe`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/leben-in-deutschland`, lastModified: LID_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/thuyet-minh`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/leben-in-deutschland/chu-de`, lastModified: LID_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/leben-in-deutschland/thi-thu`, lastModified: LID_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/lai-xe/thi-thu`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/lai-xe/de-mau`, changeFrequency: "monthly", priority: 0.7 },
    // Trang từng chương lái xe / từng bộ LiD không có trong sitemap (noindex): HTML chỉ có 1 câu + lời mời đăng nhập → AdSense coi là nội dung mỏng
    ...bizPages(),
    // Bài đang khoá với khách: Google chỉ thấy màn "đăng nhập để mở khoá" → noindex, không đưa vào sitemap
    ...listLessons()
      .filter((l) => accessOf(null)(l.id) !== "locked")
      .map((l) => ({
        url: SITE_URL + lessonPath(l.slug),
        lastModified: new Date(l.createdAt.replace(" ", "T") + "Z"),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
  ];
}
