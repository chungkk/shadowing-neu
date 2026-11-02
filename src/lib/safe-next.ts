/**
 * Chỉ cho quay lại đường dẫn nội bộ (chặn open redirect). Hỏi trực tiếp bộ phân tích URL thay vì so chuỗi:
 * trình duyệt coi "\" như "/" và bỏ qua tab / xuống dòng, nên "/\evil.com" cũng dẫn sang trang khác như "//evil.com".
 */
export function safeNext(v: unknown): string {
  const s = String(v ?? "");
  if (!s.startsWith("/")) return "/";
  try {
    const base = "http://n";
    const u = new URL(s, base);
    return u.origin === base ? u.pathname + u.search + u.hash : "/";
  } catch {
    return "/";
  }
}
