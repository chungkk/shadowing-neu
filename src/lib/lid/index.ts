import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "../auth";
import { getQuizPref, setQuizPref } from "../db";
import data from "@/content/lid/questions.json";
import { isLang, type DrivingQ, type Lang, type Tr } from "../laixe/rules";
import { LID_SET_COUNT, LID_SET_IDS, LID_STATE_CODES, LID_TOPIC_KEYS } from "./routes";

// Bộ câu hỏi "Leben in Deutschland" (danh mục BAMF, Stand 07.05.2025):
// 300 câu chung + 10 câu riêng mỗi bang. Thi thật: 33 câu (30 chung + 3 của bang), đúng ≥ 17 là đậu, 60 phút.
// Mỗi câu có `nr` = số Aufgabe chính thức (câu chung 1–300, câu bang 1–10) và `topic` (câu chung).
// ID (g1…, by1…) cố định — tiến độ người học lưu theo ID — nên KHÔNG đổi ID, chỉ sắp theo `nr`.

export const EXAM = { general: 30, state: 3, pass: 17, minutes: 60 } as const;
export const EXAM_TOTAL = EXAM.general + EXAM.state;
/** Chấm như lái xe: mỗi câu sai = 1 "điểm lỗi", sai tối đa 16 câu (= đúng ≥ 17) */
export const EXAM_MAX_WRONG = EXAM_TOTAL - EXAM.pass;
export const SET_SIZE = 30;
/** Ngày sửa nội dung gần nhất (sitemap lastModified) */
export const LID_UPDATED = new Date("2026-11-15");

export type State = { code: string; name: string; capital: string };
export const STATES: State[] = data.states;
export const getState = (code: string) => STATES.find((s) => s.code === code) ?? null;
export const DEFAULT_STATE = "be";

type Topic = (typeof LID_TOPIC_KEYS)[number];
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
const byNr = (qs: Raw[]) => qs.map((q, i) => ({ q, nr: q.nr ?? i + 1 })).sort((a, b) => a.nr - b.nr);
const GENERAL = byNr(data.general as unknown as Raw[]);
const STATE_QS = Object.fromEntries(Object.entries(data.state as unknown as Record<string, Raw[]>).map(([k, qs]) => [k, byNr(qs)]));
const ALL = new Map<string, { q: Raw; general: boolean; nr: number }>([
  ...GENERAL.map(({ q, nr }) => [q.id, { q, general: true, nr }] as const),
  ...Object.values(STATE_QS).flatMap((qs) => qs.map(({ q, nr }) => [q.id, { q, general: false, nr }] as const)),
]);

// Hằng số đường dẫn (lid/routes.ts, dùng trong proxy) phải khớp dữ liệu
if (STATES.map((s) => s.code).join() !== LID_STATE_CODES.join() || Math.ceil(GENERAL.length / SET_SIZE) !== LID_SET_COUNT)
  throw new Error("lib/lid/routes.ts không khớp src/content/lid/questions.json");

/** 3 chủ đề của danh mục BAMF — theo trường `topic` của từng câu (không theo khoảng số câu) */
export const CATEGORIES: { key: Topic; de: string; vi: string }[] = [
  { key: "politik", de: "Politik in der Demokratie", vi: "Chính trị trong nền dân chủ" },
  { key: "geschichte", de: "Geschichte und Verantwortung", vi: "Lịch sử và trách nhiệm" },
  { key: "gesellschaft", de: "Mensch und Gesellschaft", vi: "Con người và xã hội" },
];
const topicIds = (key: Topic) => GENERAL.filter((x) => x.q.topic === key).map((x) => x.q.id);
/** Dữ liệu đã gán chủ đề cho mọi câu chung chưa (chưa → ẩn mục học theo chủ đề) */
export const hasTopics = () => GENERAL.every((x) => x.q.topic);

export const generalIds = () => GENERAL.map((x) => x.q.id);
export const stateIds = (code: string) => (STATE_QS[code] ?? []).map((x) => x.q.id);
export const generalCount = () => GENERAL.length;
export const hasQuestion = (id: string) => ALL.has(id);
export const isGeneral = (id: string) => ALL.get(id)?.general ?? false;

// ---- Lựa chọn của người học (cookie): bang + ngôn ngữ bản dịch (dùng chung với tab Lái xe) ----

export const STATE_COOKIE = "lid_state";

/** chosen = người học đã tự chọn bang (chưa chọn thì đang dùng bang mặc định) */
/**
 * Bang đang học: đã đăng nhập → lưu theo tài khoản (đổi máy vẫn giữ, 2 người chung máy không lẫn);
 * khách → cookie. Lần đầu đăng nhập mà tài khoản chưa có bang thì nhận bang khách đã chọn trên máy này.
 */
export async function prefs(): Promise<{ state: State; lang: Lang; chosen: boolean }> {
  const jar = await cookies();
  const l = jar.get("lx_lang")?.value;
  const fromCookie = getState(jar.get(STATE_COOKIE)?.value ?? "");
  const user = await getCurrentUser();
  let picked = fromCookie;
  if (user) {
    picked = getState(getQuizPref(user.id, "lid", "state") ?? "");
    if (!picked && fromCookie) {
      setQuizPref(user.id, "lid", "state", fromCookie.code);
      picked = fromCookie;
    }
  }
  return { state: picked ?? getState(DEFAULT_STATE)!, lang: isLang(l) ? l : "vi", chosen: !!picked };
}

/** Bang đang học đã lưu trên tài khoản — chỉ đọc (không cookie, không ghi DB), cho API như chuông nhắc nhở */
export const stateFor = (userId: number): State => getState(getQuizPref(userId, "lid", "state") ?? "") ?? getState(DEFAULT_STATE)!;

/** Bộ luyện 30 câu theo số câu chính thức: 1 → câu 1–30, 2 → 31–60, … */
export function listSets() {
  return Array.from({ length: Math.ceil(GENERAL.length / SET_SIZE) }, (_, i) => {
    const qs = GENERAL.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
    return { id: String(i + 1), from: qs[0].nr, to: qs[qs.length - 1].nr, ids: qs.map((x) => x.q.id) };
  });
}

/**
 * Phạm vi học: "hoc" (câu chung + câu của bang), "tat-ca" (300 câu chung), chủ đề ("politik"…), bộ 30 câu ("1".."10") hoặc mã bang ("bw"…)
 */
export function getSet(id: string, stateCode = DEFAULT_STATE): { title: string; subtitle: string; ids: string[] } | null {
  if (!LID_SET_IDS.includes(id)) return null;
  // "hoc": nút Học — 300 câu chung + 10 câu của bang đang chọn
  if (id === "hoc") return { title: "Học tất cả", subtitle: `${GENERAL.length} câu chung + 10 câu của bang`, ids: [...generalIds(), ...stateIds(stateCode)] };
  if (id === "tat-ca") return { title: "300 câu chung", subtitle: `${GENERAL.length} câu, theo thứ tự danh mục BAMF`, ids: generalIds() };
  const cat = CATEGORIES.find((c) => c.key === id);
  if (cat) {
    const ids = topicIds(cat.key);
    return ids.length ? { title: cat.vi, subtitle: `${cat.de} · ${ids.length} câu`, ids } : null;
  }
  const state = getState(id);
  if (state) return { title: `10 câu riêng của ${state.name}`, subtitle: `Thủ phủ: ${state.capital}`, ids: stateIds(id) };
  const set = listSets().find((s) => s.id === id);
  if (!set) return null;
  return { title: `Câu ${set.from}–${set.to}`, subtitle: "300 câu chung", ids: set.ids };
}


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

/** Nhãn số câu như danh mục BAMF: "Câu 153" · "Bayern · câu 3" */
export const questionLabel = (id: string) => {
  const x = ALL.get(id);
  if (!x) return "";
  return x.general ? `Câu ${x.nr}` : `${getState(id.replace(/\d+$/, ""))?.name ?? ""} · câu ${x.nr}`;
};

/**
 * Câu theo thứ tự `ids` cho màn làm bài (LidRunner). Không xáo lựa chọn: có câu chọn hình "1"–"4" như danh mục.
 * withAnswers=false (thi thử): không gửi đáp án xuống trình duyệt — server chấm khi nộp bài.
 */
export async function forClient(ids: string[], { withAnswers = true } = {}): Promise<DrivingQ[]> {
  return ids.flatMap((id) => {
    const x = ALL.get(id);
    if (!x) return [];
    const { q } = x;
    const vi: Tr = { q: q.qVi, o: q.options.map((o) => o.textVi), c: "" };
    return [
      {
        id: q.id,
        chapter: questionLabel(id),
        points: 1,
        grund: x.general,
        q: q.q,
        stem: null,
        options: q.options.map(({ key, text }) => ({ key, text })),
        answer: withAnswers ? q.answer : [],
        explain: withAnswers ? (q.explainVi ?? "") : "",
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

/** Dữ liệu chấm bài ở server (mỗi câu 1 điểm) */
export const gradable = (ids: string[]) =>
  ids.flatMap((id) => {
    const x = ALL.get(id);
    return x ? [{ id, points: 1, options: x.q.options, answer: x.q.answer }] : [];
  });
