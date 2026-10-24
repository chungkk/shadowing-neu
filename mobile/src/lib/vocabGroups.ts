import type { TFn } from "./i18n";

const DAY = 86_400_000;

/** "2026-10-19 08:00:00" (UTC, như server lưu) → Date */
export const savedAt = (createdAt: string) => new Date(createdAt.replace(" ", "T") + "Z");

/**
 * Nhóm mục sổ từ theo ngày lưu (giữ thứ tự đầu vào — server trả mới nhất trước):
 * Hôm nay · Hôm qua · từng ngày trong tuần qua (thứ + ngày) · cũ hơn thì từng tháng.
 * Dùng chung cho tab Từ vựng và lựa chọn "theo ngày lưu" ở màn Ôn tập để 2 nơi nhóm giống nhau.
 */
export function groupBySaved<T extends { createdAt: string }>(items: T[], t: TFn, lang: string): { key: string; title: string; data: T[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = new Map<string, { title: string; data: T[] }>();
  for (const v of items) {
    const d = savedAt(v.createdAt);
    let key = "?";
    let title = "—";
    if (!isNaN(+d)) {
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      const ago = Math.round((+today - +day) / DAY);
      if (ago <= 6) {
        key = day.toDateString();
        title =
          ago <= 0
            ? t("vocab.today")
            : ago === 1
              ? t("vocab.yesterday")
              : d.toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "numeric" });
      } else {
        key = `${d.getFullYear()}-${d.getMonth()}`;
        title = d.toLocaleDateString(lang, { month: "long", year: "numeric" });
      }
    }
    const g = groups.get(key) ?? groups.set(key, { title, data: [] }).get(key)!;
    g.data.push(v);
  }
  return [...groups].map(([key, g]) => ({ key, ...g }));
}
