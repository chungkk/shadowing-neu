import { useSyncExternalStore } from "react";
import type { ProgressSummary } from "./api";

/**
 * Tiến độ vừa học trên máy này — màn học ghi vào mỗi khi đổi câu / làm xong câu chính tả / học lại từ đầu.
 * Tab Bài học ưu tiên bản này hơn danh sách tải từ server: lúc rời màn học, lần lưu cuối có thể chưa tới server
 * khi tab Bài học tải lại → không hiện tiến độ cũ, và tab không cần tải lại /progress mỗi lần mở.
 * So bản nào mới hơn bằng thời điểm server trả về (updatedAt / at), không dùng đồng hồ máy.
 */
type Entry = {
  user: number;
  source: string;
  p: ProgressSummary | null; // null = vừa "Học lại từ đầu" (tiến độ bị xoá)
  seq: number; // lần ghi thứ mấy — lần lưu cũ trả về muộn không đánh dấu nhầm bản mới hơn
  savedAt: number | null; // giờ server lúc lưu xong bản này (null = chưa lưu xong)
};

let entries = new Map<string, Entry>(); // "<user>|<source>" → bản mới nhất
let lastSeq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** Ghi trạng thái mới nhất của 1 bài (chưa lưu lên server) → số thứ tự, đưa lại cho progressSaved khi lưu xong */
export function noteProgress(user: number, source: string, p: ProgressSummary | null): number {
  const seq = ++lastSeq;
  entries = new Map(entries).set(`${user}|${source}`, { user, source, p, seq, savedAt: null });
  emit();
  return seq;
}

/** Server đã lưu (hoặc xoá) xong bản thứ `seq`, lúc `at` theo giờ server */
export function progressSaved(user: number, source: string, seq: number, at: number) {
  const key = `${user}|${source}`;
  const e = entries.get(key);
  if (e?.seq !== seq) return; // đã có bản mới hơn đang chờ lưu
  entries = new Map(entries).set(key, { ...e, savedAt: at });
  emit();
}

export const useLocalProgress = () => useSyncExternalStore(subscribe, () => entries);

/** Danh sách tiến độ của `user`: bản tải từ server, thay bằng bản trên máy nếu bản trên máy mới hơn · mới nhất trước */
export function mergeProgress(server: ProgressSummary[], user: number | undefined, local: Map<string, Entry>): ProgressSummary[] {
  if (user === undefined) return server;
  const mine = new Map([...local.values()].filter((e) => e.user === user).map((e) => [e.source, e]));
  if (!mine.size) return server;
  // Bản trên máy thắng khi chưa lưu xong, hoặc server chưa có bản nào lưu sau nó (danh sách tải trước lúc lưu)
  const localWins = (e: Entry, s?: ProgressSummary) => e.savedAt === null || !s || s.updatedAt < e.savedAt;
  const out: { p: ProgressSummary; at: number; seq: number }[] = [];
  for (const s of server) {
    const e = mine.get(s.source);
    if (!e || !localWins(e, s)) out.push({ p: s, at: s.updatedAt, seq: 0 });
  }
  for (const e of mine.values()) {
    const s = server.find((x) => x.source === e.source);
    if (e.p && localWins(e, s)) out.push({ p: e.p, at: e.savedAt ?? Infinity, seq: e.seq });
  }
  return out.sort((a, b) => b.at - a.at || b.seq - a.seq).map((x) => x.p);
}
