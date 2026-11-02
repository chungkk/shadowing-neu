"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { changePassword, destroySession, envAdminEmail, getCurrentUser, requireUser, verifyPassword } from "@/lib/auth";
import { addWord, aiWordMeaning, confirmEmailChange, editProfile, removeAccount, sendEmailChangeCode } from "@/lib/account";
import { AVATAR_MAX_BYTES, imageType, removeAvatar, saveAvatar } from "@/lib/avatar";
import { deleteVocab, getUserWithHash, reviewVocab, updateVocabMeaning } from "@/lib/db";
import { addDeckEntries, getDeck } from "@/lib/decks";

export type FormResult = { error?: string; ok?: string };

// ---- Cài đặt tài khoản ----

export async function updateProfile(_: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/settings");
  const error = editProfile(user, { name: String(formData.get("name") ?? "") });
  if (error) return { error };
  refresh();
  return { ok: "Đã lưu thông tin" };
}

/** Đổi email bước 1: kiểm tra mật khẩu rồi gửi mã tới email mới. Trả về lỗi hoặc null */
export async function requestEmailChange(input: { email: string; password: string }): Promise<string | null> {
  const user = await requireUser("/settings");
  return sendEmailChangeCode(user, { email: String(input.email ?? ""), password: String(input.password ?? "") });
}

/** Đổi email bước 2: nhập đúng mã → đổi email */
export async function submitEmailChange(_: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/settings");
  const error = confirmEmailChange(user, { email: String(formData.get("email") ?? ""), code: String(formData.get("code") ?? "") });
  if (error) return { error };
  refresh();
  return { ok: "Đã đổi email" };
}

export async function updatePassword(_: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/settings");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { error: "Mật khẩu nhập lại không khớp" };
  const error = await changePassword(user, current, next);
  return error ? { error } : { ok: "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất." };
}

/** Đổi ảnh đại diện (trường "file": JPEG / PNG / WebP ≤ 1 MB — trình duyệt đã cắt vuông + thu nhỏ) */
export async function uploadAvatar(formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser("/settings");
  const file = formData.get("file");
  if (!(file instanceof Blob) || !file.size) return { error: "Thiếu ảnh" };
  if (file.size > AVATAR_MAX_BYTES) return { error: "Ảnh quá lớn (tối đa 1 MB)" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageType(bytes)) return { error: "Chỉ nhận ảnh JPEG, PNG hoặc WebP" };
  saveAvatar(user.id, bytes);
  refresh();
  return {};
}

/** Xoá ảnh đại diện → quay về chữ cái đầu tên */
export async function deleteAvatar() {
  const user = await requireUser("/settings");
  removeAvatar(user.id);
  refresh();
}

/** Xoá vĩnh viễn tài khoản + sổ từ vựng. Tài khoản Google / Apple chưa đặt mật khẩu: không hỏi mật khẩu. */
export async function deleteAccount(_: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/settings");
  if (user.email === envAdminEmail()) return { error: "Không thể xoá tài khoản admin chính." };
  const u = getUserWithHash({ id: user.id });
  if (!u || (u.hasPassword && !(await verifyPassword(String(formData.get("password") ?? ""), u.passwordHash))))
    return { error: "Mật khẩu không đúng" };
  await removeAccount(user.id);
  await destroySession();
  redirect("/");
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
  const user = await requireUser("/vocab/notebook");
  updateVocabMeaning(user.id, id, meaning.trim().slice(0, 500));
}

/** AI ghi nghĩa cho từ (lưu luôn) */
export async function aiMeaning(id: number): Promise<{ meaning: string } | { error: string }> {
  const user = await requireUser("/vocab/notebook");
  try {
    return await aiWordMeaning(user, id);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Chấm 1 lần ôn từ (lặp lại ngắt quãng) → mức nhớ + hạn ôn mới */
export async function gradeWord(id: number, correct: boolean) {
  const user = await requireUser("/vocab/notebook");
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
  const user = await requireUser("/vocab/notebook");
  deleteVocab(user.id, id);
  refresh();
}

/** Thêm các mục của 1 bộ từ (không truyền keys = cả bộ) vào sổ để ôn; learn = học xong ở màn học. Chưa đăng nhập → { error: "login" } */
export async function addDeck(slug: string, keys?: string[], learn = false): Promise<{ added: number } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "login" };
  const deck = getDeck(slug);
  if (!deck) return { error: "Không tìm thấy bộ từ" };
  const pick = keys ? new Set(keys) : null;
  const list = pick ? deck.words.filter((w) => pick.has(w.key)) : deck.words;
  if (!list.length) return { error: "Chưa chọn từ nào" };
  // Không refresh(): màn học gọi sau mỗi câu trả lời đúng, giao diện tự đánh dấu "đã có trong sổ"
  return { added: addDeckEntries(user.id, deck, list, learn) };
}
