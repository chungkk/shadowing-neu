"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { createLesson, deleteLesson, LEVELS, updateLesson, type Level } from "@/lib/db";
import { extractVideoId, getYouTubeTranscript } from "@/lib/youtube";
import { parseSubtitleFile, toSrt } from "@/lib/subtitles";

export type FormState = { error?: string };

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  if (!process.env.ADMIN_PASSWORD) return { error: "Chưa cấu hình ADMIN_PASSWORD trong .env.local" };
  if (!checkPassword(String(formData.get("password") ?? ""))) return { error: "Sai mật khẩu" };
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export type FetchResult =
  | { error: string }
  | {
      title: string;
      videoId: string;
      lang: string;
      auto: boolean;
      tracks: { languageCode: string; name: string; auto: boolean }[];
      srt: string;
    };

/** Admin dán link → lấy phụ đề YouTube về dạng SRT để xem / chỉnh sửa trước khi lưu */
export async function fetchSubtitles(url: string, lang?: string): Promise<FetchResult> {
  await requireAdmin();
  const videoId = extractVideoId(url);
  if (!videoId) return { error: "Link YouTube không hợp lệ" };
  try {
    const d = await getYouTubeTranscript(videoId, lang || undefined);
    return {
      title: d.title,
      videoId: d.videoId,
      lang: d.track.languageCode,
      auto: d.track.auto,
      tracks: d.tracks,
      srt: toSrt(d.segments),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function saveLesson(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const url = String(formData.get("url") ?? "");
  let title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const level = String(formData.get("level")) as Level;
  const published = formData.get("published") === "on";
  const srt = String(formData.get("srt") ?? "");

  const videoId = extractVideoId(url);
  if (!videoId) return { error: "Link YouTube không hợp lệ" };
  if (!LEVELS.includes(level)) return { error: "Cấp độ không hợp lệ" };

  let segments = parseSubtitleFile(srt);
  // Chưa bấm "Lấy phụ đề" → tự lấy luôn khi lưu
  if (!srt.trim()) {
    try {
      const d = await getYouTubeTranscript(videoId);
      segments = d.segments;
      title ||= d.title;
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
  if (!segments.length) return { error: "Phụ đề trống hoặc sai định dạng SRT" };
  if (!title) return { error: "Nhập tiêu đề bài học" };

  const lesson = { title, videoId, description, level, published, segments };
  if (id) updateLesson(id, lesson);
  else createLesson(lesson);
  redirect("/admin");
}

export async function removeLesson(id: number) {
  await requireAdmin();
  deleteLesson(id);
  refresh();
}
