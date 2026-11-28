import data from "@content/lid/questions.json";
import type { DrivingQ, Tr } from "@shared/laixe/rules";
import { STATE_CODES } from "./ids";
import { l } from "./strings";
import { shuffle } from "./util";

// Bộ câu hỏi "Leben in Deutschland" — cùng file dữ liệu với web (src/content/lid), đóng gói trong app.
// 300 câu chung + 10 câu riêng mỗi bang. Thi thật: 33 câu (30 chung + 3 của bang), đúng ≥ 17 là đậu, 60 phút.

export const EXAM = { general: 30, state: 3, pass: 17, minutes: 60 } as const;
export const EXAM_TOTAL = EXAM.general + EXAM.state;
/** Chấm như lái xe: mỗi câu sai = 1 "điểm lỗi", sai tối đa 16 câu (= đúng ≥ 17) */
export const EXAM_MAX_WRONG = EXAM_TOTAL - EXAM.pass;
export const SET_SIZE = 30;

export type State = { code: string; name: string; capital: string };
export const STATES: State[] = data.states;
export const getState = (code: string) => STATES.find((s) => s.code === code) ?? null;
export { DEFAULT_STATE } from "./ids";
if (__DEV__ && STATES.map((s) => s.code).join() !== STATE_CODES.join()) console.warn("quiz/ids.ts: STATE_CODES lệch với questions.json");

type Topic = "politik" | "geschichte" | "gesellschaft";
/** 1 câu trong questions.json (nr = số Aufgabe BAMF; topic chỉ có ở câu chung; explainVi = giải thích ngắn, không bắt buộc) */
type Raw = {
  id: string;
  q: string;
  qVi: string;
  options: { key: string; text: string; textVi: string }[];
  answer: string[];
  image: string | null;
  nr?: number;
  topic?: Topic;
  explainVi?: string;
};
// Sắp theo số Aufgabe chính thức (`nr`); ID giữ nguyên vì tiến độ lưu theo ID
const byNr = (qs: Raw[]) => qs.map((q, i) => ({ q, nr: q.nr ?? i + 1 })).sort((a, b) => a.nr - b.nr);
const GENERAL = byNr(data.general as unknown as Raw[]);
const STATE_QS = Object.fromEntries(Object.entries(data.state as unknown as Record<string, Raw[]>).map(([k, qs]) => [k, byNr(qs)]));
const ALL = new Map<string, { q: Raw; general: boolean; nr: number }>([
  ...GENERAL.map(({ q, nr }) => [q.id, { q, general: true, nr }] as const),
  ...Object.values(STATE_QS).flatMap((qs) => qs.map(({ q, nr }) => [q.id, { q, general: false, nr }] as const)),
]);

/** 3 chủ đề của danh mục BAMF — theo trường `topic` của từng câu */
export const CATEGORIES: { key: Topic; de: string; vi: string }[] = [
  { key: "politik", de: "Politik in der Demokratie", vi: "Chính trị trong nền dân chủ" },
  { key: "geschichte", de: "Geschichte und Verantwortung", vi: "Lịch sử và trách nhiệm" },
  { key: "gesellschaft", de: "Mensch und Gesellschaft", vi: "Con người và xã hội" },
];

export const generalIds = () => GENERAL.map((x) => x.q.id);
export const stateIds = (code: string) => (STATE_QS[code] ?? []).map((x) => x.q.id);
export const hasQuestion = (id: string) => ALL.has(id);
export const isGeneral = (id: string) => ALL.get(id)?.general ?? false;

/** Bộ luyện 30 câu theo số câu chính thức: 1 → câu 1–30, 2 → 31–60, … */
export function listSets() {
  return Array.from({ length: Math.ceil(GENERAL.length / SET_SIZE) }, (_, i) => {
    const qs = GENERAL.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
    return { id: String(i + 1), from: qs[0].nr, to: qs[qs.length - 1].nr, ids: qs.map((x) => x.q.id) };
  });
}

/** Phạm vi học: "hoc" / "all" (câu chung + câu của bang), "tat-ca" (300 câu chung), chủ đề, bộ 30 câu ("1".."10") hoặc "state" (câu của bang) */
export function getSet(id: string, stateCode: string): { title: string; subtitle: string; ids: string[] } | null {
  if (id === "hoc" || id === "all") return { title: l("Học tất cả", "Alle lernen"), subtitle: l(`${GENERAL.length} câu chung + 10 câu của bang`, `${GENERAL.length} allgemeine + 10 Landesfragen`), ids: [...generalIds(), ...stateIds(stateCode)] };
  if (id === "tat-ca") return { title: l("300 câu chung", "300 allgemeine Fragen"), subtitle: l(`${GENERAL.length} câu`, `${GENERAL.length} Fragen`), ids: generalIds() };
  const cat = CATEGORIES.find((c) => c.key === id);
  if (cat) {
    const ids = GENERAL.filter((x) => x.q.topic === cat.key).map((x) => x.q.id);
    return ids.length ? { title: l(cat.vi, cat.de), subtitle: l(`${cat.de} · ${ids.length} câu`, `${ids.length} Fragen`), ids } : null;
  }
  if (id === "state") {
    const state = getState(stateCode);
    return state ? { title: state.name, subtitle: l(`Thủ phủ: ${state.capital} · 10 câu`, `Hauptstadt: ${state.capital} · 10 Fragen`), ids: stateIds(state.code) } : null;
  }
  const set = listSets().find((s) => s.id === id);
  return set ? { title: l(`Câu ${set.from}–${set.to}`, `Fragen ${set.from}–${set.to}`), subtitle: l("300 câu chung", "300 allgemeine Fragen"), ids: set.ids } : null;
}

/** Đề thi thử: 30 câu chung ngẫu nhiên + 3 câu của bang */
export const examQuestionIds = (stateCode: string): string[] => [
  ...shuffle(generalIds()).slice(0, EXAM.general),
  ...shuffle(stateIds(stateCode)).slice(0, EXAM.state),
];


/** Câu theo thứ tự `ids` cho màn làm bài. Không xáo lựa chọn: có câu chọn hình "1"–"4" */
export function questions(ids: string[]): DrivingQ[] {
  return ids.flatMap((id) => {
    const x = ALL.get(id);
    if (!x) return [];
    const { q } = x;
    const vi: Tr = { q: q.qVi, o: q.options.map((o) => o.textVi), c: "" };
    return [
      {
        id: q.id,
        chapter: x.general ? l(`Câu ${x.nr}`, `Frage ${x.nr}`) : `${getState(q.id.replace(/\d+$/, ""))?.name ?? ""} · ${l(`câu ${x.nr}`, `Frage ${x.nr}`)}`,
        points: 1,
        grund: x.general,
        q: q.q,
        stem: null,
        options: q.options.map(({ key, text }) => ({ key, text })),
        answer: q.answer,
        explain: q.explainVi ?? "",
        images: q.image ? [q.image] : [],
        optionImages: false,
        poster: null,
        video: null,
        tr: vi,
        order: q.options.map((_, i) => i),
      },
    ];
  });
}
