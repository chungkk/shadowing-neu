import "server-only";
import { headers } from "next/headers";

// Giới hạn số lần gọi theo khoá (lưu trong RAM, đủ cho 1 server)
const hits = new Map<string, { n: number; reset: number }>();

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

/** IP người gọi (sau proxy của Coolify) */
export async function clientIp(): Promise<string> {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
