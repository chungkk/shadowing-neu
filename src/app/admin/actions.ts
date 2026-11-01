"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { adminSetPassword, envAdminEmail, requireAdmin } from "@/lib/auth";
import { createLesson, deleteLesson, getUserById, LEVELS, deleteSavedTranscripts, getCached, savedTranscriptKeys, setCached, setLessonPublished, setUserRole, updateLesson, type Level, type Role } from "@/lib/db";
import { extractVideoId, getYouTubeTranscript, type Transcript } from "@/lib/youtube";
import { mergeIntoSentences, parseSubtitleFile, toSrt } from "@/lib/subtitles";
import { prewarmPhrases } from "@/lib/phrases";
import { removeAccount } from "@/lib/account";
import { slugify } from "@/lib/slug";
import { saveLockSettings } from "@/lib/access";

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
      srt: toSrt(mergeIntoSentences(d.segments)), // gộp sẵn thành câu để admin đọc / sửa theo câu
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
  const slug = slugify(String(formData.get("slug") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const level = String(formData.get("level")) as Level;
  const published = formData.get("published") === "on";
  const dictation = formData.get("dictation") === "on";
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

  const lesson = { title, slug, videoId, description, level, published, dictation, segments };
  if (id) updateLesson(id, lesson);
  else createLesson(lesson);
  prewarmPhrases(segments);
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

/** Đặt mật khẩu mới cho người dùng khác (người đó bị đăng xuất trên mọi thiết bị) */
export async function resetUserPassword(id: number, _: FormState & { ok?: string }, formData: FormData): Promise<FormState & { ok?: string }> {
  const target = await editableUser(id);
  if (!target) return { error: "Không thể đổi mật khẩu tài khoản này" };
  const error = await adminSetPassword(target.id, String(formData.get("password") ?? ""));
  return error ? { error } : { ok: `Đã đổi mật khẩu cho ${target.email}. Người này đã bị đăng xuất trên mọi thiết bị.` };
}

export async function removeUser(id: number) {
  if (await editableUser(id)) await removeAccount(id);
  refresh();
}

/** Cài đặt khoá bài học (trang Cài đặt của admin): bật / tắt + các bài miễn phí */
export async function saveLessonLock(_: FormState & { ok?: string }, formData: FormData): Promise<FormState & { ok?: string }> {
  await requireAdmin();
  const enabled = formData.get("enabled") === "on";
  const free = formData.getAll("free").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (enabled && !free.length) return { error: "Chọn ít nhất 1 bài miễn phí trước khi bật khoá" };
  saveLockSettings({ enabled, free });
  refresh();
  return { ok: enabled ? "Đã bật khoá bài học" : "Đã lưu — khoá bài học đang tắt, mọi bài đều mở" };
}

export async function toggleLessonPublished(id: number, published: boolean) {
  await requireAdmin();
  setLessonPublished(id, published);
  refresh();
}

// ---- Phụ đề video YouTube đã lưu ----

/** Sửa phụ đề đã lưu: cập nhật mọi bản lưu cùng track của video (bản "mặc định" + theo mã track) */
export async function saveTranscript(videoId: string, key: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const original = getCached<Transcript>(key);
  if (!original || original.videoId !== videoId) return { error: "Không tìm thấy phụ đề đã lưu (có thể vừa bị xoá)." };
  const title = String(formData.get("title") ?? "").trim();
  const segments = parseSubtitleFile(String(formData.get("srt") ?? ""));
  if (!title) return { error: "Nhập tiêu đề" };
  if (!segments.length) return { error: "Phụ đề trống hoặc sai định dạng SRT" };

  for (const k of savedTranscriptKeys(videoId)) {
    const t = getCached<Transcript>(k);
    if (!t) continue;
    const sameTrack = k === key || (!k.endsWith(":whisper") && !key.endsWith(":whisper") && t.track.languageCode === original.track.languageCode);
    setCached(k, sameTrack ? { ...t, title, segments } : { ...t, title }, null);
  }
  prewarmPhrases(segments);
  redirect("/admin/transcripts");
}

/** Xoá phụ đề đã lưu của video → lần sau có người mở sẽ lấy lại từ YouTube / Whisper */
export async function removeTranscripts(videoId: string) {
  await requireAdmin();
  deleteSavedTranscripts(videoId);
  refresh();
}
