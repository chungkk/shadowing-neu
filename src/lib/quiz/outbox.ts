"use client";

import { clientApi } from "../client-api";

/**
 * Hàng đợi gửi lại tiến độ trả lời của web (Leben in Deutschland): gửi lỗi mạng / lỗi máy chủ → lưu trong localStorage,
 * gửi lại khi có mạng, khi mở màn học lần sau hoặc ngay sau lần gửi thành công kế tiếp. Lỗi 4xx (dữ liệu sai) thì bỏ.
 * Mỗi tài khoản một hàng đợi riêng ("quiz-outbox:u<id>"): chỉ gửi khi đúng người đó đang đăng nhập,
 * không để câu trả lời của người trước bị ghi vào tài khoản người sau trên cùng trình duyệt.
 * App di động có hàng đợi riêng (mobile/src/lib/quiz/store.ts).
 */

type Answer = { qid: string; picked: string[] };
type Store = { answers: Record<string, Answer[]> };
const LEGACY_KEY = "quiz-outbox"; // bản cũ không ghi chủ → không biết của ai, bỏ
const MAX = 500;
const keyOf = (userId: number) => `quiz-outbox:u${userId}`;

function read(userId: number): Store {
  try {
    localStorage.removeItem(LEGACY_KEY);
    const s = JSON.parse(localStorage.getItem(keyOf(userId)) ?? "null") as Store | null;
    if (s && typeof s === "object" && s.answers) return s;
  } catch {}
  return { answers: {} };
}
function write(userId: number, s: Store) {
  try {
    if (Object.values(s.answers).some((a) => a.length)) localStorage.setItem(keyOf(userId), JSON.stringify(s));
    else localStorage.removeItem(keyOf(userId));
  } catch {}
}

/** Lỗi tạm thời (mất mạng / 5xx) → nên giữ lại để gửi sau */
const retryable = (e: Error) => /kết nối|máy chủ \(5\d\d\)/i.test(e.message);

let flushing: Promise<void> | null = null;

/** Gửi các câu trả lời đang chờ của 1 tài khoản (mỗi lần tối đa 100 câu / module) */
export function flushOutbox(userId: number): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const s = read(userId);
    for (const [module, list] of Object.entries(s.answers)) {
      while (list.length) {
        const batch = list.slice(0, 100);
        try {
          await clientApi("/quiz", { method: "POST", body: { module, answers: batch } });
        } catch (e) {
          if (retryable(e as Error)) return write(userId, s);
        }
        list.splice(0, batch.length);
        write(userId, s);
      }
    }
  })().finally(() => (flushing = null));
  return flushing;
}

/** Ghi 1 câu trả lời: gửi ngay, lỗi tạm thời thì xếp hàng gửi lại */
export function sendAnswer(userId: number, module: string, a: Answer) {
  clientApi("/quiz", { method: "POST", body: { module, answers: [a] }, keepalive: true })
    .then(() => {
      if (read(userId).answers[module]?.length) void flushOutbox(userId);
    })
    .catch((e: Error) => {
      if (!retryable(e)) return;
      const s = read(userId);
      s.answers[module] = [...(s.answers[module] ?? []), a].slice(-MAX);
      write(userId, s);
    });
}

/** Gọi 1 lần khi mở màn học: gửi phần còn chờ + gửi lại khi có mạng */
export function watchOutbox(userId: number): () => void {
  void flushOutbox(userId);
  const on = () => void flushOutbox(userId);
  window.addEventListener("online", on);
  return () => window.removeEventListener("online", on);
}
