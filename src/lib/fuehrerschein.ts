import "server-only";
import data from "@/content/fuehrerschein/klasse-b.json";
import type { QuizQuestion } from "./quiz-types";

// Bộ câu hỏi lý thuyết lái xe hạng B (nhập từ ckk-biz bằng scripts/import-portal-content.mjs)

type Raw = (typeof data.questions)[number];

/** Chủ đề (gộp phần cơ bản 1.x và phần hạng B 2.x cùng tên) */
export const TOPICS = [
  { key: "gefahrenlehre", de: "Gefahrenlehre", vi: "Nhận biết nguy hiểm" },
  { key: "verhalten", de: "Verhalten im Straßenverkehr", vi: "Hành vi khi tham gia giao thông" },
  { key: "vorfahrt", de: "Vorfahrt, Vorrang", vi: "Quyền ưu tiên" },
  { key: "verkehrszeichen", de: "Verkehrszeichen", vi: "Biển báo giao thông" },
  { key: "umweltschutz", de: "Umweltschutz", vi: "Bảo vệ môi trường" },
  { key: "vorschriften", de: "Vorschriften über den Betrieb der Fahrzeuge", vi: "Quy định vận hành xe" },
  { key: "technik", de: "Technik", vi: "Kỹ thuật" },
  { key: "eignung", de: "Eignung und Befähigung", vi: "Năng lực người lái" },
] as const;

const topicOf = (themeName: string) => {
  const n = themeName.toLowerCase();
  return TOPICS.find((t) => n.startsWith(t.key.slice(0, 6)))?.key ?? "verhalten";
};

const toQuestion = (q: Raw): QuizQuestion => ({
  id: q.id,
  q: q.q,
  qVi: q.qVi,
  options: q.options,
  answer: q.answer,
  explain: q.explain,
  explainVi: q.explainVi,
  images: q.images,
  video: q.video,
  points: q.points,
  label: `${q.id} · ${q.points} điểm`,
});

const ALL = data.questions;
const byChapter = new Map<string, Raw[]>();
for (const q of ALL) (byChapter.get(q.chapter) ?? byChapter.set(q.chapter, []).get(q.chapter)!).push(q);

export type Chapter = { id: string; name: string; ids: string[] };
export type Topic = { key: string; de: string; vi: string; chapters: Chapter[]; ids: string[] };

/** Chủ đề → chương (theo thứ tự trong bộ đề) */
export function listTopics(): Topic[] {
  return TOPICS.map((t) => {
    const chapters = [...byChapter]
      .filter(([, qs]) => topicOf(qs[0].themeName) === t.key)
      .map(([id, qs]) => ({ id, name: qs[0].chapterName, ids: qs.map((q) => q.id) }));
    return { ...t, chapters, ids: chapters.flatMap((c) => c.ids) };
  }).filter((t) => t.chapters.length);
}

export function getChapter(id: string): { chapter: Chapter; topic: (typeof TOPICS)[number]; questions: QuizQuestion[] } | null {
  const qs = byChapter.get(id);
  if (!qs) return null;
  const topic = TOPICS.find((t) => t.key === topicOf(qs[0].themeName))!;
  return { chapter: { id, name: qs[0].chapterName, ids: qs.map((q) => q.id) }, topic, questions: qs.map(toQuestion) };
}

export const chapterIds = () => [...byChapter.keys()];
export const questionCount = () => ALL.length;
export const allIds = () => ALL.map((q) => q.id);
export const hasQuestion = (id: string) => ALL.some((q) => q.id === id);

export function questionsByIds(ids: string[]): QuizQuestion[] {
  const want = new Set(ids);
  return ALL.filter((q) => want.has(q.id)).map(toQuestion);
}

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Đề thi thử hạng B: 30 câu = 20 câu phần cơ bản (1.x) + 10 câu phần hạng B (2.x).
 * Đậu khi tổng điểm lỗi ≤ 10 và không sai 2 câu 5 điểm (luật thi thật). Đề thật bốc câu theo chủ đề; ở đây bốc ngẫu nhiên.
 */
export function examQuestions(): QuizQuestion[] {
  const basic = ALL.filter((q) => q.theme.startsWith("1."));
  const extra = ALL.filter((q) => q.theme.startsWith("2."));
  return [...shuffle(basic).slice(0, 20), ...shuffle(extra).slice(0, 10)].map(toQuestion);
}

export const EXAM = { questions: 30, maxErrorPoints: 10, minutes: 45 } as const;
