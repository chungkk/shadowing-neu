import "server-only";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createNewsPost, getSetting, setSetting } from "./db";

/**
 * Mục "Hướng dẫn" (/huong-dan): bài viết dài hạn cho người Việt ở Đức. Lưu ở bảng news_posts (lib/db.ts),
 * cột category = khoá chuyên mục bên dưới. Mỗi chuyên mục có thể dẫn sang phần ôn tập liên quan trên ckk.biz.
 */
export type GuideCategory = { key: string; label: string; tool?: { href: string; label: string; text: string } };

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { key: "giay-to", label: "Giấy tờ & cư trú" },
  {
    key: "lai-xe",
    label: "Bằng lái xe",
    tool: { href: "/lai-xe", label: "Ôn lý thuyết lái xe", text: "1.191 câu hỏi thi hạng B, có tiếng Việt và thi thử" },
  },
  {
    key: "quoc-tich",
    label: "Quốc tịch & Leben in Deutschland",
    tool: { href: "/leben-in-deutschland", label: "Ôn Leben in Deutschland", text: "310 câu hỏi có tiếng Việt, thi thử 33 câu" },
  },
  { key: "thue-tien", label: "Thuế, lương & bảo hiểm" },
  {
    key: "tieng-duc",
    label: "Học tiếng Đức",
    tool: { href: "/tieng-duc", label: "Học tiếng Đức với video", text: "Nghe, nói theo và chép chính tả từng câu" },
  },
  { key: "doi-song", label: "Đời sống ở Đức" },
];

export const guideCategory = (key: string) => GUIDE_CATEGORIES.find((c) => c.key === key) ?? null;
/** Tên chuyên mục để hiện (bài cũ có thể lưu chữ tự do) */
export const categoryLabel = (key: string) => guideCategory(key)?.label ?? key;

export const guidePath = (slug: string) => `/huong-dan/${slug}`;

/** Thời gian đọc ước tính (khoảng 200 từ / phút) */
export const readingMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

// ---------- Bài mẫu (bản nháp) ----------

const SEED_DIR = path.join(process.cwd(), "content", "guides");

/** File .md: dòng "khoá: giá trị" ở đầu (giữa 2 dòng ---), sau đó là nội dung */
function parseSeed(text: string) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const meta = Object.fromEntries(
    m[1].split("\n").map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  return { meta, body: m[2].trim() };
}

/**
 * Nạp các bài hướng dẫn mẫu trong content/guides/ thành BẢN NHÁP — chỉ 1 lần (lần đầu admin mở trang quản lý).
 * Admin đọc, sửa cho đúng rồi mới đăng.
 */
export function seedGuidesOnce(authorId: number): number {
  if (getSetting<boolean>("guides:seeded")) return 0;
  setSetting("guides:seeded", true);
  let n = 0;
  let files: string[] = [];
  try {
    files = readdirSync(SEED_DIR).filter((f) => f.endsWith(".md")).sort();
  } catch {
    return 0;
  }
  for (const f of files) {
    const s = parseSeed(readFileSync(path.join(SEED_DIR, f), "utf8"));
    if (!s?.meta.title) continue;
    createNewsPost(
      {
        title: s.meta.title,
        summary: s.meta.summary ?? "",
        body: s.body,
        category: s.meta.category ?? "",
        sourceName: s.meta.sourceName ?? "",
        sourceUrl: s.meta.sourceUrl ?? "",
        published: false,
      },
      authorId,
    );
    n++;
  }
  return n;
}
