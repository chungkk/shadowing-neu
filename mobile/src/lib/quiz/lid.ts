import data from "@content/lid/questions.json";
import type { DrivingQ, Tr } from "@shared/fuehrerschein-rules";
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
export const DEFAULT_STATE = "be";

type Raw = (typeof data.general)[number];
const GENERAL = data.general;
const STATE_QS = data.state as Record<string, Raw[]>;
const ALL = new Map<string, { q: Raw; general: boolean; number: number }>([
  ...GENERAL.map((q, i) => [q.id, { q, general: true, number: i + 1 }] as const),
  ...Object.values(STATE_QS).flatMap((qs) => qs.map((q, i) => [q.id, { q, general: false, number: 301 + i }] as const)),
]);

/** 3 nhóm chủ đề của 300 câu chung */
export const CATEGORIES = [
  { key: "politik", de: "Politik in der Demokratie", vi: "Chính trị trong nền dân chủ", from: 1, to: 100 },
  { key: "geschichte", de: "Geschichte und Verantwortung", vi: "Lịch sử và trách nhiệm", from: 101, to: 200 },
  { key: "gesellschaft", de: "Mensch und Gesellschaft", vi: "Con người và xã hội", from: 201, to: 300 },
] as const;

export const generalIds = () => GENERAL.map((q) => q.id);
export const stateIds = (code: string) => (STATE_QS[code] ?? []).map((q) => q.id);
export const hasQuestion = (id: string) => ALL.has(id);
export const isGeneral = (id: string) => ALL.get(id)?.general ?? false;

/** Bộ luyện 30 câu: 1 → câu 1–30, 2 → 31–60, … */
export function listSets() {
  return Array.from({ length: Math.ceil(GENERAL.length / SET_SIZE) }, (_, i) => {
    const qs = GENERAL.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
    return { id: String(i + 1), from: i * SET_SIZE + 1, to: i * SET_SIZE + qs.length, ids: qs.map((q) => q.id) };
  });
}

/** Phạm vi học: "hoc" (câu chung + câu của bang), "tat-ca" (300 câu chung), nhóm chủ đề, bộ 30 câu ("1".."10") hoặc "state" (câu của bang) */
export function getSet(id: string, stateCode: string): { title: string; subtitle: string; ids: string[] } | null {
  if (id === "hoc") return { title: "Tất cả", subtitle: `${GENERAL.length} câu chung + câu của bang`, ids: [...generalIds(), ...stateIds(stateCode)] };
  if (id === "tat-ca") return { title: "Tất cả câu chung", subtitle: `${GENERAL.length} câu`, ids: generalIds() };
  const cat = CATEGORIES.find((c) => c.key === id);
  if (cat) return { title: cat.vi, subtitle: `${cat.de} · câu ${cat.from}–${cat.to}`, ids: GENERAL.slice(cat.from - 1, cat.to).map((q) => q.id) };
  if (id === "state") {
    const state = getState(stateCode);
    return state ? { title: state.name, subtitle: `Thủ phủ: ${state.capital} · câu 301–310`, ids: stateIds(state.code) } : null;
  }
  const set = listSets().find((s) => s.id === id);
  return set ? { title: `Câu ${set.from}–${set.to}`, subtitle: "300 câu chung", ids: set.ids } : null;
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
        chapter: x.general ? `Câu ${x.number}` : `${getState(q.id.replace(/\d+$/, ""))?.name ?? ""} · câu ${x.number}`,
        points: 1,
        grund: x.general,
        q: q.q,
        stem: null,
        options: q.options.map(({ key, text }) => ({ key, text })),
        answer: q.answer,
        explain: "",
        images: q.image ? [q.image] : [],
        optionImages: false,
        poster: null,
        video: null,
        tr: vi ?? null,
        order: q.options.map((_, i) => i),
      },
    ];
  });
}
