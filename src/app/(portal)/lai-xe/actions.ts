"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { CLASS_COOKIE, LANG_COOKIE, isClassId } from "@/lib/fuehrerschein";
import { isLang } from "@/lib/fuehrerschein-rules";
import { STATE_COOKIE, getState } from "@/lib/lid";

// Tab Lái xe: hạng bằng đang học và ngôn ngữ bản dịch lưu trong cookie (dùng được cả khi chưa đăng nhập)

const YEAR = 365 * 24 * 3600;

export async function setLicenseClass(cls: string) {
  if (!isClassId(cls)) return;
  (await cookies()).set(CLASS_COOKIE, cls, { maxAge: YEAR, sameSite: "lax", path: "/" });
  refresh();
}

/** Leben in Deutschland: bang đang ở (câu riêng của bang + đề thi thử) */
export async function setLidState(code: string) {
  if (!getState(code)) return;
  (await cookies()).set(STATE_COOKIE, code, { maxAge: YEAR, sameSite: "lax", path: "/" });
  refresh();
}

export async function setTranslationLang(lang: string) {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, { maxAge: YEAR, sameSite: "lax", path: "/" });
  refresh();
}
