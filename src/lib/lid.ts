import "server-only";
import { cookies } from "next/headers";
import data from "@/content/lid/questions.json";
import { isLang, type DrivingQ, type Lang, type Tr } from "./fuehrerschein-rules";

// Bộ câu hỏi "Leben in Deutschland" (nhập từ lid-app bằng scripts/import-portal-content.mjs):
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

/** 3 nhóm chủ đề của 300 câu chung (như app) */
export const CATEGORIES = [
  { key: "politik", de: "Politik in der Demokratie", vi: "Chính trị trong nền dân chủ", from: 1, to: 100 },
  { key: "geschichte", de: "Geschichte und Verantwortung", vi: "Lịch sử và trách nhiệm", from: 101, to: 200 },
  { key: "gesellschaft", de: "Mensch und Gesellschaft", vi: "Con người và xã hội", from: 201, to: 300 },
] as const;

export const generalIds = () => GENERAL.map((q) => q.id);
export const stateIds = (code: string) => (STATE_QS[code] ?? []).map((q) => q.id);
export const generalCount = () => GENERAL.length;
export const hasQuestion = (id: string) => ALL.has(id);
export const isGeneral = (id: string) => ALL.get(id)?.general ?? false;

// ---- Lựa chọn của người học (cookie): bang + ngôn ngữ bản dịch (dùng chung với tab Lái xe) ----

export const STATE_COOKIE = "lid_state";

export async function prefs(): Promise<{ state: State; lang: Lang }> {
  const jar = await cookies();
  const l = jar.get("lx_lang")?.value;
  return { state: getState(jar.get(STATE_COOKIE)?.value ?? "") ?? getState(DEFAULT_STATE)!, lang: isLang(l) ? l : "vi" };
}

/** Bộ luyện 30 câu: 1 → câu 1–30, 2 → 31–60, … */
export function listSets() {
  return Array.from({ length: Math.ceil(GENERAL.length / SET_SIZE) }, (_, i) => {
    const qs = GENERAL.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
    return { id: String(i + 1), from: i * SET_SIZE + 1, to: i * SET_SIZE + qs.length, ids: qs.map((q) => q.id) };
  });
}

/**
 * Phạm vi học: "hoc" (câu chung + câu của bang), "tat-ca" (300 câu chung), nhóm chủ đề ("politik"…), bộ 30 câu ("1".."10") hoặc mã bang ("bw"…)
 */
export function getSet(id: string, stateCode = DEFAULT_STATE): { title: string; subtitle: string; ids: string[] } | null {
  // "hoc": nút Học của app — 300 câu chung + 10 câu của bang đang chọn
  if (id === "hoc") return { title: "Tất cả", subtitle: `${GENERAL.length} câu chung + câu của bang`, ids: [...generalIds(), ...stateIds(stateCode)] };
  if (id === "tat-ca") return { title: "Tất cả câu chung", subtitle: `${GENERAL.length} câu`, ids: generalIds() };
  const cat = CATEGORIES.find((c) => c.key === id);
  if (cat) return { title: cat.vi, subtitle: `${cat.de} · câu ${cat.from}–${cat.to}`, ids: GENERAL.slice(cat.from - 1, cat.to).map((q) => q.id) };
  const state = getState(id);
  if (state) return { title: `Câu hỏi riêng của ${state.name}`, subtitle: `Thủ phủ: ${state.capital} · câu 301–310`, ids: stateIds(id) };
  const set = listSets().find((s) => s.id === id);
  if (!set) return null;
  return { title: `Câu ${set.from}–${set.to}`, subtitle: "300 câu chung", ids: set.ids };
}

export const setIds = () => ["hoc", "tat-ca", ...CATEGORIES.map((c) => c.key), ...listSets().map((s) => s.id), ...STATES.map((s) => s.code)];

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Đề thi thử: 30 câu chung ngẫu nhiên + 3 câu của bang. Gọi sau cookies()/connection() (dùng Math.random) */
export function examQuestionIds(stateCode: string): string[] {
  return [...shuffle(generalIds()).slice(0, EXAM.general), ...shuffle(stateIds(stateCode)).slice(0, EXAM.state)];
}

const PACKS: Record<Exclude<Lang, "vi">, () => Promise<Record<string, Tr>>> = {
  en: () => import("@/content/lid/tr-en.json").then((m) => m.default as Record<string, Tr>),
  ar: () => import("@/content/lid/tr-ar.json").then((m) => m.default as Record<string, Tr>),
  zh: () => import("@/content/lid/tr-zh.json").then((m) => m.default as Record<string, Tr>),
  ru: () => import("@/content/lid/tr-ru.json").then((m) => m.default as Record<string, Tr>),
};

/** Câu theo thứ tự `ids` cho màn làm bài chung (DrivingRunner). Không xáo lựa chọn: có câu chọn hình "1"–"4" như app */
export async function forClient(ids: string[], lang: Lang): Promise<DrivingQ[]> {
  const pack = lang === "vi" ? null : await PACKS[lang]();
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
        tr: (pack ? pack[id] : vi) ?? null,
        order: q.options.map((_, i) => i),
      },
    ];
  });
}

/** Dữ liệu chấm bài ở server (mỗi câu 1 điểm) */
export const gradable = (ids: string[]) =>
  ids.flatMap((id) => {
    const x = ALL.get(id);
    return x ? [{ id, points: 1, options: x.q.options, answer: x.q.answer }] : [];
  });
