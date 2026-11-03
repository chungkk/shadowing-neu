import "server-only";
import {
  ARTIKEL_GOAL,
  ARTIKEL_LADDER,
  ARTIKEL_ROUND_CAP,
  ARTIKEL_SECONDS,
  ARTIKEL_STAKES,
  ARTIKEL_WIN_CAP,
  type ArtikelLimits,
  type ArtikelResult,
  type ArtikelReveal,
  type ArtikelState,
} from "./artikel";
import { activeArtikelRound, artikelUsage, closeArtikelRound, createArtikelRound, getPoints, stepArtikelRound, type ArtikelRound } from "./db";
import { artikelWords } from "./decks";

/**
 * Ván Der Die Das do server giữ: đáp án không rời server trước khi trả lời, kim cương tính lại ở đây chứ không tin số của máy khách.
 * Các hàm chạy đồng bộ từ lúc đọc ván tới lúc ghi nên 2 request cùng lúc không chen được vào giữa.
 */

const GRACE_MS = 1500; // bù độ trễ mạng khi hết giờ
const WINDOW_MS = 24 * 60 * 60 * 1000; // luôn tính 24 giờ gần nhất: múi giờ do máy khách gửi thì đổi được để "qua ngày"

type Failure = { error: string; status: number };

function limitsOf(userId: number, now: number): ArtikelLimits {
  const { net, rounds } = artikelUsage(userId, now - WINDOW_MS);
  return { roundsLeft: Math.max(0, ARTIKEL_ROUND_CAP - rounds), winLeft: Math.max(0, ARTIKEL_WIN_CAP - net) };
}

/** Kim cương nhận về khi chốt với `correct` từ đúng (phần lời không vượt trần 24 giờ) */
function payoutOf(r: ArtikelRound, correct: number, limits: ArtikelLimits) {
  const full = Math.floor((r.stake * ARTIKEL_LADDER[correct]) / 100);
  const payout = Math.min(full, r.stake + limits.winLeft);
  return { payout, capped: payout < full };
}

function stateOf(userId: number, r: ArtikelRound | null, now: number, extra: { reveal?: ArtikelReveal; result?: ArtikelResult } = {}): ArtikelState {
  const limits = limitsOf(userId, now);
  const round = r && {
    stake: r.stake,
    correct: r.correct,
    pot: r.correct ? payoutOf(r, r.correct, limits).payout : 0,
    nextPot: payoutOf(r, Math.min(r.correct + 1, ARTIKEL_GOAL), limits).payout,
    phase: r.phase as "word" | "choose",
    word: r.phase === "word" ? { word: r.words[r.correct].word, meaning: r.words[r.correct].meaning } : null,
    msLeft: r.phase === "word" ? Math.max(0, r.deadline - now) : 0,
  };
  return { total: getPoints(userId).total, limits, round, ...extra };
}

function lose(userId: number, r: ArtikelRound, now: number, correct: boolean, timedOut: boolean): ArtikelState {
  const w = r.words[r.correct];
  closeArtikelRound(r.id, "lost", r.correct, 0, now);
  return stateOf(userId, null, now, {
    reveal: { ...w, correct, timedOut },
    result: { won: false, stake: r.stake, payout: 0, correct: r.correct, capped: false },
  });
}

function cash(userId: number, r: ArtikelRound, correct: number, now: number, reveal?: ArtikelReveal): ArtikelState {
  const { payout, capped } = payoutOf(r, correct, limitsOf(userId, now));
  closeArtikelRound(r.id, "won", correct, payout, now);
  return stateOf(userId, null, now, { reveal, result: { won: true, stake: r.stake, payout, correct, capped } });
}

/** Từ đang hiện đã quá giờ (đóng tab, mất mạng) → thua như không trả lời: nếu được giữ tiền thì cứ thấy từ khó là đóng tab */
const expired = (r: ArtikelRound, now: number) => r.phase === "word" && now > r.deadline + GRACE_MS;

export function artikelState(userId: number, now = Date.now()): ArtikelState {
  const r = activeArtikelRound(userId);
  return r && expired(r, now) ? lose(userId, r, now, false, true) : stateOf(userId, r, now);
}

export function startArtikel(userId: number, deck: string, stake: number, now = Date.now()): ArtikelState | Failure {
  const active = activeArtikelRound(userId);
  if (active && !expired(active, now)) return { error: "Bạn đang có ván chưa xong", status: 409 };
  if (active) lose(userId, active, now, false, true);
  if (!ARTIKEL_STAKES.includes(stake)) return { error: "Mức đặt không hợp lệ", status: 400 };
  const pool = artikelWords(deck);
  if (pool.length < ARTIKEL_GOAL) return { error: "Bộ từ này chưa chơi được", status: 400 };
  const limits = limitsOf(userId, now);
  if (!limits.roundsLeft) return { error: `Bạn đã chơi đủ ${ARTIKEL_ROUND_CAP} ván trong 24 giờ qua, quay lại sau nhé`, status: 429 };
  if (!limits.winLeft) return { error: `Bạn đã lời đủ ${ARTIKEL_WIN_CAP} kim cương trong 24 giờ qua, quay lại sau nhé`, status: 429 };
  if (getPoints(userId).total < stake) return { error: "Không đủ kim cương", status: 400 };
  const words = [...pool];
  for (let i = 0; i < ARTIKEL_GOAL; i++) {
    const j = i + Math.floor(Math.random() * (words.length - i));
    [words[i], words[j]] = [words[j], words[i]];
  }
  createArtikelRound(userId, deck, stake, words.slice(0, ARTIKEL_GOAL), now + ARTIKEL_SECONDS * 1000, now);
  return stateOf(userId, activeArtikelRound(userId), now);
}

/** article = null: hết giờ ở máy khách */
export function answerArtikel(userId: number, article: string | null, now = Date.now()): ArtikelState | Failure {
  const r = activeArtikelRound(userId);
  if (r?.phase !== "word") return { error: "Không có từ nào đang chờ trả lời", status: 409 };
  if (article === null || now > r.deadline + GRACE_MS) return lose(userId, r, now, false, true);
  const w = r.words[r.correct];
  if (article !== w.gender) return lose(userId, r, now, false, false);
  const correct = r.correct + 1;
  const reveal = { ...w, correct: true, timedOut: false };
  if (correct === ARTIKEL_GOAL) return cash(userId, r, correct, now, reveal);
  stepArtikelRound(r.id, correct, "choose", 0);
  return stateOf(userId, activeArtikelRound(userId), now, { reveal });
}

export function nextArtikel(userId: number, now = Date.now()): ArtikelState | Failure {
  const r = activeArtikelRound(userId);
  if (r?.phase !== "choose") return { error: "Chưa thể sang từ tiếp theo", status: 409 };
  stepArtikelRound(r.id, r.correct, "word", now + ARTIKEL_SECONDS * 1000);
  return stateOf(userId, activeArtikelRound(userId), now);
}

/** Chỉ chốt được giữa 2 từ: nếu chốt được lúc từ đang hiện thì gặp từ không biết cứ chốt, không bao giờ mất */
export function cashArtikel(userId: number, now = Date.now()): ArtikelState | Failure {
  const r = activeArtikelRound(userId);
  if (r?.phase !== "choose") return { error: "Chỉ chốt được giữa 2 từ", status: 409 };
  return cash(userId, r, r.correct, now);
}
