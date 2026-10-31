/**
 * Gọi /api/v1 từ trình duyệt (đăng nhập bằng cookie phiên của web). Lỗi → ném Error kèm thông báo tiếng Việt của server.
 * Dùng cho các component client của web; app di động có bản riêng (mobile/src/lib/api.ts).
 */
export async function clientApi<T>(path: string, init: { method?: string; body?: unknown; keepalive?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api/v1" + path, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      keepalive: init.keepalive,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Lỗi máy chủ (${res.status})`);
  return data as T;
}
