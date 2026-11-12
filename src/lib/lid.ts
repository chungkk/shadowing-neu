import "server-only";
import data from "@/content/lid/questions.json";
import type { QuizQuestion } from "./quiz-types";

// Bộ câu hỏi "Leben in Deutschland" (nhập từ lid-app bằng scripts/import-portal-content.mjs):
// 300 câu chung + 10 câu riêng mỗi bang. Thi thật: 33 câu (30 chung + 3 của bang), đúng ≥ 17 là đậu, 60 phút.

export const EXAM = { general: 30, state: 3, pass: 17, minutes: 60 } as const;
export const SET_SIZE = 30;

export type State = { code: string; name: string; capital: string };
export const STATES: State[] = data.states;
export const getState = (code: string) => STATES.find((s) => s.code === code) ?? null;

const withLabel = ({ image, ...q }: (typeof data.general)[number], label: string): QuizQuestion => ({ ...q, images: image ? [image] : [], label });

const GENERAL = data.general.map((q, i) => withLabel(q, `Câu ${i + 1}`));
const STATE_QS = data.state as Record<string, typeof data.general>;
const stateQuestions = (code: string) => (STATE_QS[code] ?? []).map((q, i) => withLabel(q, `${getState(code)?.name} · câu ${i + 1}`));

/** Bộ luyện câu chung: 1 → câu 1–30, 2 → 31–60, … */
export function listSets() {
  return Array.from({ length: Math.ceil(GENERAL.length / SET_SIZE) }, (_, i) => {
    const qs = GENERAL.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
    return { id: String(i + 1), from: i * SET_SIZE + 1, to: i * SET_SIZE + qs.length, ids: qs.map((q) => q.id) };
  });
}

/** Câu của 1 bộ: "1".."10" (câu chung) hoặc mã bang "bw", "by"… */
export function getSet(id: string): { title: string; questions: QuizQuestion[] } | null {
  const state = getState(id);
  if (state) return { title: `Câu hỏi riêng của ${state.name}`, questions: stateQuestions(id) };
  const set = listSets().find((s) => s.id === id);
  if (!set) return null;
  return { title: `Câu ${set.from}–${set.to}`, questions: GENERAL.slice(set.from - 1, set.to) };
}

export const setIds = () => [...listSets().map((s) => s.id), ...STATES.map((s) => s.code)];
export const generalCount = () => GENERAL.length;
export const stateIds = (code: string) => stateQuestions(code).map((q) => q.id);
export const hasQuestion = (id: string) => GENERAL.some((q) => q.id === id) || Object.values(STATE_QS).some((qs) => qs.some((q) => q.id === id));

export function questionsByIds(ids: string[]): QuizQuestion[] {
  const want = new Set(ids);
  return [...GENERAL, ...STATES.flatMap((s) => stateQuestions(s.code))].filter((q) => want.has(q.id));
}

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function examQuestions(stateCode: string): QuizQuestion[] {
  return [...shuffle(GENERAL).slice(0, EXAM.general), ...shuffle(stateQuestions(stateCode)).slice(0, EXAM.state)];
}
