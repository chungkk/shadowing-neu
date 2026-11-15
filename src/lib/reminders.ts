import "server-only";
import { unfinished, percent } from "@/components/ContinueLearning";
import { deckLearnedAt, dueCount, getStats, quizAnsweredAt, quizStats } from "./db";
import { deckCounts, deckMarks, getDeck, listDecks } from "./decks";
import { learnTree, prefs as laixePrefs } from "./fuehrerschein";
import { generalIds, getSet, listSets, prefs as lidPrefs, stateIds } from "./lid";
import { summarize, type QuizStat } from "./quiz-types";

/**
 * Nhắc nhở học (chuông thông báo trên thanh đầu trang · GET /api/v1/reminders):
 * đang học gì, tới đâu, phần nào chưa xong — gom từ cả 3 phần Tiếng Đức · Lái xe · Leben in Deutschland.
 */

export type ReminderSection = "de" | "laixe" | "lid";
export type Reminder = {
  id: string; // ổn định — client nhớ đã xem chưa
  section: ReminderSection;
  kind: "streak" | "review" | "lesson" | "deck" | "chapter" | "wrong";
  title: string;
  detail: string;
  href: string;
  percent?: number; // tiến độ 0–100 (nếu có)
  at: number; // lần học gần nhất (ms) — 0: không áp dụng
  daily?: boolean; // nhắc lại mỗi ngày (đã xem hôm qua thì hôm nay vẫn báo mới)
};

const LESSONS = 3; // số bài video dở hiện tối đa
const DECKS = 2;
const CHAPTERS = 2;

/** % làm tròn xuống, có làm ít nhất 1 thì tối thiểu 1% (giống thẻ "Tiếp tục học") */
const pct = (n: number, total: number) => (n ? Math.max(1, Math.floor((n * 100) / total)) : 0);

const lastAt = (ids: string[], at: Map<string, number>) => ids.reduce((m, id) => Math.max(m, at.get(id) ?? 0), 0);

/** Nhóm câu đã làm một phần (hoặc làm hết nhưng còn câu sai) → chưa hoàn thành */
const inProgress = (s: ReturnType<typeof summarize>) => s.done > 0 && s.ok < s.total;

function quizGroups(
  section: "laixe" | "lid",
  groups: { key: string; title: string; ids: string[]; href: string }[],
  stats: Record<string, QuizStat>,
  at: Map<string, number>,
  limit: number,
): Reminder[] {
  return groups
    .map((g) => ({ g, s: summarize(g.ids, stats), at: lastAt(g.ids, at) }))
    .filter((x) => inProgress(x.s))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map(({ g, s, at }) => ({
      id: `${section}:chapter:${g.key}`,
      section,
      kind: "chapter" as const,
      title: g.title,
      detail: s.done < s.total ? `Đã làm ${s.done}/${s.total} câu${s.wrong ? ` · ${s.wrong} câu sai` : ""}` : `Còn ${s.wrong} câu sai cần làm lại`,
      href: g.href,
      percent: pct(s.ok, s.total),
      at,
    }));
}

function wrongReminder(section: "laixe" | "lid", ids: string[], stats: Record<string, QuizStat>, href: string): Reminder[] {
  const s = summarize(ids, stats);
  if (!s.wrong) return [];
  return [{ id: `${section}:wrong`, section, kind: "wrong", title: `Ôn lại ${s.wrong} câu đang sai`, detail: `Đã làm ${s.done}/${s.total} câu của cả phần`, href, at: 0, daily: true }];
}

/** Tiếng Đức: chuỗi ngày sắp đứt · từ đến hạn ôn · bài video đang dở · bộ từ đang học dở */
function deutsch(userId: number, tz: number): Reminder[] {
  const out: Reminder[] = [];
  const stats = getStats(userId, tz);
  const due = dueCount(userId);
  if (stats.streak > 0 && !stats.studiedToday)
    out.push({
      id: "de:streak",
      section: "de",
      kind: "streak",
      title: `Giữ chuỗi ${stats.streak} ngày học`,
      detail: "Hôm nay bạn chưa học — ôn vài từ hoặc chép một câu chính tả là đủ",
      href: due ? "/vocab/notebook?review=1" : "/tieng-duc",
      at: 0,
      daily: true,
    });
  if (due) out.push({ id: "de:review", section: "de", kind: "review", title: `${due} từ đến hạn ôn`, detail: "Ôn đúng hạn để nhớ lâu hơn", href: "/vocab/notebook?review=1", at: 0, daily: true });

  for (const { p, href, title } of unfinished(userId, LESSONS)) {
    const dict = Object.keys(p.dictDone).length;
    out.push({
      id: `de:lesson:${p.source}`,
      section: "de",
      kind: "lesson",
      title,
      detail: p.mode === "dictation" && dict ? `Đang chép chính tả · ${dict}/${p.total} câu` : `Đang ở câu ${p.idx + 1}/${p.total}`,
      href,
      percent: percent(p),
      at: p.updatedAt,
    });
  }

  const marks = deckMarks(userId);
  const deckAt = deckLearnedAt(userId);
  out.push(
    ...listDecks()
      .filter((d) => deckAt.has(d.slug))
      .flatMap((d) => {
        const deck = getDeck(d.slug);
        if (!deck) return [];
        const { learned } = deckCounts(deck, marks);
        return learned > 0 && learned < deck.words.length ? [{ d, learned, total: deck.words.length }] : [];
      })
      .sort((a, b) => (deckAt.get(b.d.slug) ?? 0) - (deckAt.get(a.d.slug) ?? 0))
      .slice(0, DECKS)
      .map(({ d, learned, total }) => ({
        id: `de:deck:${d.slug}`,
        section: "de" as const,
        kind: "deck" as const,
        title: d.title,
        detail: `Đã học ${learned}/${total} từ · còn ${total - learned} từ`,
        href: `/vocab/decks/${d.slug}`,
        percent: pct(learned, total),
        at: deckAt.get(d.slug) ?? 0,
      })),
  );
  return out;
}

/** Lái xe: chương đang học dở (theo hạng đang học) · câu đang sai. Chưa làm câu nào → không nhắc */
async function laixe(userId: number): Promise<Reminder[]> {
  const stats = quizStats(userId, "fuehrerschein");
  if (!Object.keys(stats).length) return [];
  const { cls } = await laixePrefs();
  const tree = learnTree(cls);
  const chapters = tree.flatMap((p) => p.themes.flatMap((t) => t.chapters.map((c) => ({ key: c.id, title: `Chương ${c.id} · ${c.vi || c.de}`, ids: c.ids, href: `/lai-xe/hoc/${c.id}` }))));
  return [
    ...quizGroups("laixe", chapters, stats, quizAnsweredAt(userId, "fuehrerschein"), CHAPTERS),
    ...wrongReminder("laixe", tree.flatMap((p) => p.ids), stats, "/lai-xe/cau-sai"),
  ];
}

/** Leben in Deutschland: bộ 30 câu / 10 câu của bang đang làm dở · câu đang sai */
async function lid(userId: number): Promise<Reminder[]> {
  const stats = quizStats(userId, "lid");
  if (!Object.keys(stats).length) return [];
  const { state } = await lidPrefs();
  const sets = [
    ...listSets().map((s) => ({ key: s.id, title: `Câu ${s.from}–${s.to}`, ids: s.ids, href: `/leben-in-deutschland/${s.id}` })),
    { key: state.code, title: getSet(state.code, state.code)?.title ?? state.name, ids: stateIds(state.code), href: `/leben-in-deutschland/${state.code}` },
  ];
  return [
    ...quizGroups("lid", sets, stats, quizAnsweredAt(userId, "lid"), CHAPTERS),
    ...wrongReminder("lid", [...generalIds(), ...stateIds(state.code)], stats, "/leben-in-deutschland/cau-sai"),
  ];
}

/** Mọi nhắc nhở của 1 người: việc gấp (chuỗi ngày, đến hạn ôn) trước, rồi theo lần học gần nhất */
export async function listReminders(userId: number, tz = 0): Promise<Reminder[]> {
  const all = [...deutsch(userId, tz), ...(await laixe(userId)), ...(await lid(userId))];
  const rank = (r: Reminder) => (r.kind === "streak" ? 0 : r.kind === "review" ? 1 : 2);
  return all.sort((a, b) => rank(a) - rank(b) || b.at - a.at);
}
