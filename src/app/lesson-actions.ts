"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { unlockLesson } from "@/lib/access";

/** Mở khoá bài (lượt chọn miễn phí hoặc trả kim cương) → trang tự tải lại thành màn học · points: tổng kim cương mới */
export async function unlockLessonAction(id: number): Promise<{ error?: string; points?: number }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Đăng nhập để mở khoá bài này" };
  const r = unlockLesson(user, id);
  if ("error" in r) return { error: r.error };
  refresh();
  return { points: r.info.points };
}
