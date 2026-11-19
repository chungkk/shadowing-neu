"use server";

import { getCurrentUser } from "@/lib/auth";
import { extractVideoId } from "@/lib/youtube-id";
import { makeOwnLesson } from "@/lib/own-lesson";
import { allow } from "@/lib/rate-limit";

/** Lưu video đang học thử thành bài học riêng (trừ kim cương) → slug bài để chuyển sang, points: tổng kim cương mới */
export async function saveOwnLessonAction(rawId: string): Promise<{ error?: string; slug?: string; points?: number }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Đăng nhập để lưu bài học riêng" };
  const videoId = extractVideoId(rawId);
  if (!videoId) return { error: "Link YouTube không hợp lệ" };
  if (!allow(`own-lesson:u:${user.id}`, 10, 60 * 60_000)) return { error: "Bạn tạo bài quá nhiều trong thời gian ngắn, thử lại sau nhé." };
  return makeOwnLesson(user, videoId);
}
