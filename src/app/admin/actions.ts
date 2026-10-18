"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { envAdminEmail, requireAdmin } from "@/lib/auth";
import { createLesson, deleteLesson, deleteUser, getUserById, LEVELS, setUserRole, updateLesson, type Level, type Role } from "@/lib/db";
import { extractVideoId, getYouTubeTranscript } from "@/lib/youtube";
import { parseSubtitleFile, toSrt } from "@/lib/subtitles";

export type FormState = { error?: string };

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
    const d = await getYouTubeTranscript(videoId, lang || undefined, { whisper: true });
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
      const d = await getYouTubeTranscript(videoId, undefined, { whisper: true });
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

/** Không cho sửa chính mình hoặc tài khoản admin cố định (ADMIN_EMAIL) */
async function editableUser(id: number) {
  const me = await requireAdmin();
  const target = getUserById(id);
  if (!target || target.id === me.id || target.email === envAdminEmail()) return null;
  return target;
}

export async function changeUserRole(id: number, role: Role) {
  if (role !== "user" && role !== "admin") return;
  if (await editableUser(id)) setUserRole(id, role);
  refresh();
}

export async function removeUser(id: number) {
  if (await editableUser(id)) deleteUser(id);
  refresh();
}
