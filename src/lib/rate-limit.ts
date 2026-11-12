import "server-only";
import { headers } from "next/headers";

// Giới hạn số lần gọi theo khoá (lưu trong RAM, đủ cho 1 server; để ở globalThis → dùng chung giữa các route)
const g = globalThis as unknown as { __rateHits?: Map<string, { n: number; reset: number }> };
const hits = (g.__rateHits ??= new Map());

/** true = còn lượt (đã tính lần này); tối đa `max` lần / `windowMs` cho mỗi khoá */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return true;
  }
  return ++h.n <= max;
}

/**
 * IP người gọi (sau proxy của Coolify). Proxy thêm IP nó thấy vào CUỐI x-forwarded-for, phần đầu do người gọi tự gửi nên giả được
 * → đếm từ cuối. TRUSTED_PROXY_HOPS = số proxy đứng trước app (mặc định 1; thêm Cloudflare phía trước thì đặt 2).
 */
export async function clientIp(): Promise<string> {
  const ips = (await headers()).get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const hops = Number(process.env.TRUSTED_PROXY_HOPS) || 1;
  return ips[Math.max(0, ips.length - hops)] || "local";
}

/**
 * Hạn mức chung cho mọi lời gọi AI theo yêu cầu của người dùng (tra từ, cụm từ, chia cụm, AI ghi nghĩa):
 * 200 lần / 10 phút và 2000 lần / ngày mỗi người. Admin không bị giới hạn.
 * Tài khoản tạo được dễ (Google) nên "cần đăng nhập" không đủ để chặn lạm dụng.
 */
export function aiAllowed(user: { id: number; role?: string }): boolean {
  if (user.role === "admin") return true;
  return allow(`ai:10m:${user.id}`, 200, 10 * 60_000) && allow(`ai:day:${user.id}`, 2000, 24 * 3600_000);
}
export const AI_LIMIT_MSG = "Bạn dùng AI quá nhiều trong thời gian ngắn, thử lại sau ít phút nhé.";
