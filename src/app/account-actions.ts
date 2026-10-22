"use server";

import { refresh } from "next/cache";
import { changePassword, getCurrentUser, requireUser } from "@/lib/auth";
import { addWord, aiWordMeaning, editProfile } from "@/lib/account";
import { deleteVocab, reviewVocab, updateVocabMeaning } from "@/lib/db";

export type FormResult = { error?: string; ok?: string };

// ---- Cài đặt tài khoản ----

export async function updateProfile(_: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/settings");
  const error = editProfile(user, {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  });
  if (error) return { error };
  refresh();
  return { ok: "Đã lưu thông tin" };
}

export async function updatePassword(_: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/settings");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { error: "Mật khẩu nhập lại không khớp" };
  const error = await changePassword(user, current, next);
  return error ? { error } : { ok: "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất." };
}

// ---- Sổ từ vựng ----

/** Lưu từ đang học. Chưa đăng nhập → trả lỗi để giao diện mời đăng nhập. */
export async function saveWord(input: {
  word: string;
  context: string;
  sourceUrl: string | null;
  sourceTitle: string;
}): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "login" };
  const res = addWord(user, input);
  if (typeof res === "string") return { error: res };
  return { ok: "Đã lưu" };
}

export async function setWordMeaning(id: number, meaning: string) {
  const user = await requireUser("/vocab");
  updateVocabMeaning(user.id, id, meaning.trim().slice(0, 500));
}

/** AI ghi nghĩa cho từ (lưu luôn) */
export async function aiMeaning(id: number): Promise<{ meaning: string } | { error: string }> {
  const user = await requireUser("/vocab");
  try {
    return await aiWordMeaning(user, id);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Chấm 1 lần ôn từ (lặp lại ngắt quãng) → mức nhớ + hạn ôn mới */
export async function gradeWord(id: number, correct: boolean) {
  const user = await requireUser("/vocab");
  return reviewVocab(user.id, id, {
    grade: correct ? "good" : "again",
    mode: "duolingo",
    exercise: "web",
    recall: null,
    speaking: null,
    autoClear: null,
  });
}

export async function removeWord(id: number) {
  const user = await requireUser("/vocab");
  deleteVocab(user.id, id);
  refresh();
}
