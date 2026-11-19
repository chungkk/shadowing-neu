/** created_at trong DB là "YYYY-MM-DD HH:MM:SS" theo UTC → ms */
export const sqlTime = (s: string) => Date.parse(`${s.replace(" ", "T")}Z`);

/** "vừa xong" · "5 phút trước" · "3 ngày trước" · "2 tháng trước" (null → "chưa học") */
export function ago(ms: number | null, now = Date.now()): string {
  if (ms == null) return "chưa học";
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)} ngày trước`;
  if (s < 365 * 86400) return `${Math.floor(s / (30 * 86400))} tháng trước`;
  return `${Math.floor(s / (365 * 86400))} năm trước`;
}

/** Ngày giờ theo giờ Đức (admin ở Đức) */
export const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("vi-VN", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const PROVIDER_LABEL = { google: "Google", apple: "Apple" } as const;

/** Giờ hiện tại lúc render trên server (trang admin luôn render theo request) */
export const nowMs = () => Date.now();
