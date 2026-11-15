"use client";

import { clientApi } from "./client-api";

/**
 * Hàng đợi gửi lại tiến độ trả lời của web (Leben in Deutschland): gửi lỗi mạng / lỗi máy chủ → lưu trong localStorage,
 * gửi lại khi có mạng, khi mở màn học lần sau hoặc ngay sau lần gửi thành công kế tiếp. Lỗi 4xx (dữ liệu sai) thì bỏ.
 * App di động có hàng đợi riêng (mobile/src/lib/quiz/store.ts).
 */

type Answer = { qid: string; picked: string[] };
type Store = { answers: Record<string, Answer[]> };
const KEY = "quiz-outbox";
const MAX = 500;

function read(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Store | null;
    if (s && typeof s === "object" && s.answers) return s;
  } catch {}
  return { answers: {} };
}
function write(s: Store) {
  try {
    if (Object.values(s.answers).some((a) => a.length)) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
}

/** Lỗi tạm thời (mất mạng / 5xx) → nên giữ lại để gửi sau */
const retryable = (e: Error) => /kết nối|máy chủ \(5\d\d\)/i.test(e.message);

let flushing: Promise<void> | null = null;

/** Gửi các câu trả lời đang chờ (mỗi lần tối đa 100 câu / module) */
export function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const s = read();
    for (const [module, list] of Object.entries(s.answers)) {
      while (list.length) {
        const batch = list.slice(0, 100);
        try {
          await clientApi("/quiz", { method: "POST", body: { module, answers: batch } });
        } catch (e) {
          if (retryable(e as Error)) return write(s);
        }
        list.splice(0, batch.length);
        write(s);
      }
    }
  })().finally(() => (flushing = null));
  return flushing;
}

/** Ghi 1 câu trả lời: gửi ngay, lỗi tạm thời thì xếp hàng gửi lại */
export function sendAnswer(module: string, a: Answer) {
  clientApi("/quiz", { method: "POST", body: { module, answers: [a] }, keepalive: true })
    .then(() => {
      if (read().answers[module]?.length) void flushOutbox();
    })
    .catch((e: Error) => {
      if (!retryable(e)) return;
      const s = read();
      s.answers[module] = [...(s.answers[module] ?? []), a].slice(-MAX);
      write(s);
    });
}

/** Gọi 1 lần khi mở màn học: gửi phần còn chờ + gửi lại khi có mạng */
export function watchOutbox(): () => void {
  void flushOutbox();
  const on = () => void flushOutbox();
  window.addEventListener("online", on);
  return () => window.removeEventListener("online", on);
}
