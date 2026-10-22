import "server-only";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AVATAR_DIR, setUserAvatar } from "./db";

/**
 * Ảnh đại diện: 1 file / người dùng trong AVATAR_DIR (tên file = id). App đã cắt vuông + thu nhỏ trước khi gửi.
 * Định dạng nhận ra theo vài byte đầu file (không tin tên / Content-Type do client gửi).
 */

export const AVATAR_MAX_BYTES = 1024 * 1024; // ảnh 400×400 JPEG chỉ ~50 KB

/** JPEG / PNG / WebP → kiểu MIME; còn lại → null */
export function imageType(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

const fileOf = (userId: number) => path.join(AVATAR_DIR, String(userId));

export function saveAvatar(userId: number, bytes: Uint8Array) {
  mkdirSync(AVATAR_DIR, { recursive: true });
  writeFileSync(fileOf(userId), bytes);
  setUserAvatar(userId, Date.now());
}

export function removeAvatar(userId: number) {
  rmSync(fileOf(userId), { force: true });
  setUserAvatar(userId, null);
}

/** null = chưa có ảnh */
export function readAvatar(userId: number): { bytes: Buffer; type: string } | null {
  try {
    const bytes = readFileSync(fileOf(userId));
    const type = imageType(bytes);
    return type ? { bytes, type } : null;
  } catch {
    return null;
  }
}
