/** Đường dẫn bài học ckk.pro/<slug> — dùng được cả server lẫn trình duyệt (xem trước trong form admin) */

/** Tên thư mục / file ở gốc app — slug bài không được trùng (route tĩnh luôn thắng route [slug]) */
const RESERVED = new Set([
  "admin", "api", "lesson", "login", "register", "settings", "vocab", "watch", "forgot-password", "privacy", "terms", "leaderboard",
  "sitemap", "robots", "favicon", "icon", "apple-icon", "_next", "lai-xe", "lid", "games", "stats", "sprechen", "leben-in-deutschland", "deutsch-shadowing", "about",
  "fuehrerschein", "shadowing", "calendar", "deutsch-redewendung", "impressum", "refund", "support", "delete-account", "manifest", "download", "ckk", "apps", "brand", "deals", "praha",
]);

/** "Wie geht's? – Lektion 1: Chào hỏi" → "wie-gehts-lektion-1-chao-hoi" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu (tiếng Việt, é, à…)
    .replace(/['’]/g, "") // geht's → gehts
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export const isReservedSlug = (slug: string) => RESERVED.has(slug) || /^\d+$/.test(slug);
