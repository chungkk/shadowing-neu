// Tiến độ trả lời dùng chung cho tab Lái xe và Leben in Deutschland (server + trình duyệt)

export type QuizStat = { correct: number; wrong: number; lastOk: boolean };

/** Thống kê 1 nhóm câu: đã làm / đang đúng / đang sai */
export function summarize(ids: string[], stats: Record<string, QuizStat>) {
  let done = 0;
  let ok = 0;
  for (const id of ids) {
    const s = stats[id];
    if (!s) continue;
    done++;
    if (s.lastOk) ok++;
  }
  return { total: ids.length, done, ok, wrong: done - ok };
}
