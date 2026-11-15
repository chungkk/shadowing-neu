"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { CLASS_COOKIE, isClassId } from "@/lib/laixe";
import { STATE_COOKIE, getState } from "@/lib/lid";
import { getCurrentUser } from "@/lib/auth";
import { setQuizPref } from "@/lib/db";

// Hạng bằng / bang đang học: luôn ghi cookie (khách dùng được), đã đăng nhập thì ghi thêm vào tài khoản

const YEAR = 365 * 24 * 3600;

export async function setLicenseClass(cls: string) {
  if (!isClassId(cls)) return;
  (await cookies()).set(CLASS_COOKIE, cls, { maxAge: YEAR, sameSite: "lax", path: "/" });
  const user = await getCurrentUser();
  if (user) setQuizPref(user.id, "fuehrerschein", "class", cls);
  refresh();
}

/** Leben in Deutschland: bang đang ở (câu riêng của bang + đề thi thử) */
export async function setLidState(code: string) {
  if (!getState(code)) return;
  (await cookies()).set(STATE_COOKIE, code, { maxAge: YEAR, sameSite: "lax", path: "/" });
  const user = await getCurrentUser();
  if (user) setQuizPref(user.id, "lid", "state", code);
  refresh();
}
