import "server-only";
import { deckLearnedAt, dueCount, hasLearned, quizProgress, streakInfo } from "./db";
import { deckLearned, getDeck, listDecks } from "./decks";
import { classFor, isClassId, learnTree, type ClassId } from "./laixe";
import { generalIds, getSet, getState, listSets, stateFor, stateIds, type State } from "./lid";
import { percent, unfinished } from "./progress";
import { summarize, type QuizStat } from "./quiz/types";

/**
 * Nhắc nhở học (chuông trên thanh đầu trang · GET /api/v1/reminders, app mobile dùng chung bằng Bearer):
 * đang học gì, tới đâu, phần nào chưa xong — gom từ cả 3 phần Tiếng Đức · Lái xe · Leben in Deutschland.
 */

export type ReminderSection = "de" | "laixe" | "lid";
export type ReminderKind = "streak" | "review" | "lesson" | "deck" | "chapter" | "wrong";
export type Reminder = {
  id: string; // ổn định — client nhớ đã xem chưa
  section: ReminderSection;
  kind: ReminderKind;
  ref?: string; // khoá của nội dung (source bài học, slug bộ từ, mã chương / bộ câu) — app mobile tự mở màn hình tương ứng thay vì dùng href web
  title: string;
  detail: string;
  href: string; // đường dẫn trên web
  percent?: number; // tiến độ 0–100 (nếu có)
  at: number; // lần học gần nhất (ms) — 0: không áp dụng
  daily?: boolean; // nhắc lại mỗi ngày (đã xem hôm qua thì hôm nay vẫn báo mới)
  level?: number; // mức hiện tại (vd. số câu sai) — chỉ báo mới lại khi mức này TĂNG so với lần xem trước
  quiet?: boolean; // có trong danh sách nhưng không tính vào số đỏ (đã có huy hiệu riêng ở nơi khác)
};
export type RemindersResponse = { reminders: Reminder[]; started: boolean }; // started: đã từng học gì chưa (trạng thái rỗng)

const LESSONS = 3; // số bài video dở hiện tối đa
const DECKS = 2;
const CHAPTERS = 2;
const STALE = 30 * 86_400_000; // việc dở lâu hơn 30 ngày không nhắc nữa (đã bỏ thật, nhắc mãi chỉ gây nhiễu)

/** % làm tròn xuống, có làm ít nhất 1 thì tối thiểu 1% (giống thẻ "Tiếp tục học") */
const pct = (n: number, total: number) => (n ? Math.max(1, Math.floor((n * 100) / total)) : 0);

const lastAt = (ids: string[], at: Map<string, number>) => ids.reduce((m, id) => Math.max(m, at.get(id) ?? 0), 0);

/**
 * Nhóm câu đang học dở: đã làm ít nhất 3 câu VÀ 20% nhóm, nhưng chưa làm hết.
 * - Ngưỡng: bài thi thử ghi kết quả rải rác vào rất nhiều chương (1–2 câu mỗi chương) — không phải người học chủ động học chương đó.
 * - Đã làm hết mà còn câu sai → không nhắc ở đây, đã có mục "Còn N câu đang sai" (tránh nhắc 2 lần cùng câu).
 */
const inProgress = (s: ReturnType<typeof summarize>) => s.done < s.total && s.done >= Math.max(3, Math.ceil(s.total * 0.2));

function quizGroups(
  section: "laixe" | "lid",
  groups: { key: string; title: string; ids: string[]; href: string }[],
  { stats, at }: { stats: Record<string, QuizStat>; at: Map<string, number> },
  now: number,
): Reminder[] {
  return groups
    .map((g) => ({ g, s: summarize(g.ids, stats), at: lastAt(g.ids, at) }))
    .filter((x) => inProgress(x.s) && now - x.at < STALE)
    .sort((a, b) => b.at - a.at)
    .slice(0, CHAPTERS)
    .map(({ g, s, at }) => ({
      id: `${section}:chapter:${g.key}`,
      section,
      kind: "chapter" as const,
      ref: g.key,
      title: g.title,
      detail: `Đã làm ${s.done}/${s.total} câu${s.wrong ? ` · ${s.wrong} câu sai` : ""}`,
      href: g.href,
      percent: pct(s.done, s.total), // cùng số với chữ "Đã làm"
      at,
    }));
}

function wrongReminder(section: "laixe" | "lid", ids: string[], stats: Record<string, QuizStat>, href: string): Reminder[] {
  const s = summarize(ids, stats);
  if (!s.wrong) return [];
  // Không nhắc hằng ngày: câu sai hầu như lúc nào cũng còn → chỉ báo mới khi số câu sai tăng (level)
  return [{ id: `${section}:wrong`, section, kind: "wrong", title: `Còn ${s.wrong} câu đang sai`, detail: "Làm lại cho đúng trước khi thi thật", href, at: 0, level: s.wrong }];
}

/** Tiếng Đức: chuỗi ngày sắp đứt · từ đến hạn ôn · bài video đang dở · bộ từ đang học dở */
function deutsch(userId: number, tz: number, now: number): Reminder[] {
  const out: Reminder[] = [];
  const { streak, studiedToday } = streakInfo(userId, tz, now);
  const due = dueCount(userId, now);
  if (streak > 0 && !studiedToday)
    out.push({
      id: "de:streak",
      section: "de",
      kind: "streak",
      title: `Giữ chuỗi ${streak} ngày học tiếng Đức`,
      // Ngày có học = ôn từ, học bộ từ hoặc chép chính tả được điểm (câu mới) — xem streakInfo; làm Lái xe / LiD không tính
      detail: "Hôm nay chưa học — ôn vài từ, học một bộ từ hoặc chép chính tả một câu mới",
      href: due ? "/vocab/notebook?review=1" : "/tieng-duc",
      at: 0,
      daily: true,
    });
  // quiet: số từ đến hạn đã có huy hiệu đỏ riêng (nút "Ôn N", thanh dưới đáy) — không đếm thêm lần nữa ở chuông
  if (due)
    out.push({ id: "de:review", section: "de", kind: "review", title: `${due} từ đến hạn ôn`, detail: "Ôn đúng hạn để nhớ lâu hơn", href: "/vocab/notebook?review=1", at: 0, quiet: true });

  for (const { p, href, title } of unfinished(userId, LESSONS)) {
    if (now - p.updatedAt >= STALE) break; // mới nhất trước → các bài sau còn cũ hơn
    const dict = Object.keys(p.dictDone).length;
    out.push({
      id: `de:lesson:${p.source}`,
      section: "de",
      kind: "lesson",
      ref: p.source,
      title,
      detail: p.mode === "dictation" && dict ? `Đang chép chính tả · ${dict}/${p.total} câu` : `Đang ở câu ${p.idx + 1}/${p.total}`,
      href,
      percent: percent(p),
      at: p.updatedAt,
    });
  }

  const learned = deckLearned(userId);
  const deckAt = deckLearnedAt(userId);
  out.push(
    ...listDecks()
      .filter((d) => now - (deckAt.get(d.slug) ?? 0) < STALE)
      .flatMap((d) => {
        const deck = getDeck(d.slug);
        const keys = learned.get(d.slug);
        if (!deck || !keys) return [];
        const n = deck.words.filter((w) => keys.has(w.key)).length; // đếm như deckCounts (từ trùng khoá tính cả 2)
        return n > 0 && n < deck.words.length ? [{ d, n, total: deck.words.length, at: deckAt.get(d.slug)! }] : [];
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, DECKS)
      .map(({ d, n, total, at }) => ({
        id: `de:deck:${d.slug}`,
        section: "de" as const,
        kind: "deck" as const,
        ref: d.slug,
        title: d.title,
        detail: `Đã học ${n}/${total} từ · còn ${total - n} từ`,
        href: `/vocab/decks/${d.slug}`,
        percent: pct(n, total),
        at,
      })),
  );
  return out;
}

/** Lái xe: chương đang học dở (theo hạng đang học) · câu đang sai. Chưa làm câu nào → không nhắc */
function laixe(userId: number, now: number, cls: ClassId): Reminder[] {
  const q = quizProgress(userId, "fuehrerschein");
  if (!q.at.size) return [];
  const tree = learnTree(cls);
  const chapters = tree.flatMap((p) => p.themes.flatMap((t) => t.chapters.map((c) => ({ key: c.id, title: `Chương ${c.id} · ${c.vi || c.de}`, ids: c.ids, href: `/lai-xe/hoc/${c.id}` }))));
  return [...quizGroups("laixe", chapters, q, now), ...wrongReminder("laixe", tree.flatMap((p) => p.ids), q.stats, "/lai-xe/cau-sai")];
}

/** Leben in Deutschland: bộ 30 câu / 10 câu của bang đang làm dở · câu đang sai */
function lid(userId: number, now: number, state: State): Reminder[] {
  const q = quizProgress(userId, "lid");
  if (!q.at.size) return [];
  const sets = [
    ...listSets().map((s) => ({ key: s.id, title: `Bộ câu ${s.from}–${s.to}`, ids: s.ids, href: `/leben-in-deutschland/${s.id}` })),
    { key: state.code, title: getSet(state.code, state.code)?.title ?? state.name, ids: stateIds(state.code), href: `/leben-in-deutschland/${state.code}` },
  ];
  return [...quizGroups("lid", sets, q, now), ...wrongReminder("lid", [...generalIds(), ...stateIds(state.code)], q.stats, "/leben-in-deutschland/cau-sai")];
}

/**
 * Mọi nhắc nhở của 1 người: việc gấp (chuỗi ngày, đến hạn ôn) trước, rồi theo lần học gần nhất.
 * cls / state: hạng bằng / bang client đang chọn (app mobile lưu trên máy) — không hợp lệ / không gửi → lấy theo tài khoản (web)
 */
export function listReminders(userId: number, tz = 0, opts: { cls?: string | null; state?: string | null } = {}, now = Date.now()): RemindersResponse {
  const cls = isClassId(opts.cls) ? opts.cls : classFor(userId);
  const state = getState(opts.state ?? "") ?? stateFor(userId);
  const all = [...deutsch(userId, tz, now), ...laixe(userId, now, cls), ...lid(userId, now, state)];
  const rank = (r: Reminder) => (r.kind === "streak" ? 0 : r.kind === "review" ? 1 : 2);
  return { reminders: all.sort((a, b) => rank(a) - rank(b) || b.at - a.at), started: all.length > 0 || hasLearned(userId) };
}
