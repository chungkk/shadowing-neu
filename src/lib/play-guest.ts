import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser, sign } from "./auth";
import { createPlayGuest, playGuestById, renamePlayGuest } from "./db";

/**
 * Khách chơi Sudoku / Caro không cần tài khoản: nhập tên tạm → server cấp cookie "play_guest" = "<id>.<chữ ký>".
 * Khách chơi được mọi chế độ (game chỉ để vui, không có kim cương). Trong ván, khách mang id âm (−id) — xem play_guests trong db.ts.
 */

const COOKIE = "play_guest";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày
export const GUEST_NAME_MAX = 20;

const sigOf = (id: number) => sign(`play-guest.${id}`);

/** Tên tạm hợp lệ (gọn khoảng trắng, bỏ ký tự điều khiển) hoặc "" */
export const cleanGuestName = (v: unknown) =>
  typeof v === "string"
    ? v
        .replace(/[\p{C}]/gu, "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, GUEST_NAME_MAX)
    : "";

export async function currentGuest(): Promise<{ id: number; name: string } | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const [id, sig] = raw?.split(".") ?? [];
  if (!id || !sig || !/^\d+$/.test(id)) return null;
  const expected = Buffer.from(sigOf(Number(id)));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return playGuestById(Number(id));
}

/** Đặt / đổi tên tạm: đã có cookie khách thì đổi tên, chưa có thì tạo khách mới */
export async function saveGuest(name: string, now = Date.now()): Promise<{ id: number; name: string }> {
  const old = await currentGuest();
  if (old) {
    if (old.name !== name) renamePlayGuest(old.id, name);
    return { id: old.id, name };
  }
  const id = createPlayGuest(name, now);
  (await cookies()).set(COOKIE, `${id}.${sigOf(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { id, name };
}

/** Ai đang chơi: người dùng đăng nhập (id dương) hoặc khách (id âm); null = chưa có ai */
export async function playActor(): Promise<{ id: number; guest: boolean } | null> {
  const user = await getCurrentUser();
  if (user) return { id: user.id, guest: false };
  const g = await currentGuest();
  return g ? { id: -g.id, guest: true } : null;
}
