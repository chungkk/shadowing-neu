"use server";

import { refresh } from "next/cache";
import { changePassword, envAdminEmail, getCurrentUser, requireUser } from "@/lib/auth";
import { deleteVocab, emailTaken, saveVocab, updateUserProfile, updateVocabMeaning } from "@/lib/db";

export type FormResult = { error?: string; ok?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Cài đặt tài khoản ----

export async function updateProfile(_: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/settings");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fixedAdmin = user.email === envAdminEmail();

  if (!name) return { error: "Nhập tên của bạn" };
  if (name.length > 60) return { error: "Tên tối đa 60 ký tự" };
  if (!fixedAdmin) {
    if (!EMAIL_RE.test(email)) return { error: "Email không hợp lệ" };
    if (email === envAdminEmail() || emailTaken(email, user.id)) return { error: "Email này đã được dùng" };
  }
  // Admin chính giữ nguyên email (khớp biến ADMIN_EMAIL)
  updateUserProfile(user.id, { name, email: fixedAdmin ? user.email : email });
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
  const word = input.word.trim().slice(0, 80);
  if (!word) return { error: "Từ trống" };
  const sourceUrl = input.sourceUrl && /^\/(lesson|watch)\/[\w-]+$/.test(input.sourceUrl) ? input.sourceUrl : null;
  saveVocab(user.id, {
    word,
    context: input.context.slice(0, 500),
    sourceUrl,
    sourceTitle: input.sourceTitle.slice(0, 200),
  });
  return { ok: "Đã lưu" };
}

export async function setWordMeaning(id: number, meaning: string) {
  const user = await requireUser("/vocab");
  updateVocabMeaning(user.id, id, meaning.trim().slice(0, 500));
}

export async function removeWord(id: number) {
  const user = await requireUser("/vocab");
  deleteVocab(user.id, id);
  refresh();
}
