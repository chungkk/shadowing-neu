import { useSyncExternalStore } from "react";
import { File, Paths } from "expo-file-system";
import { isLang, type ExamAnswer, type ExamRecord, type ExamResult, type Lang } from "@shared/fuehrerschein-rules";
import type { QuizStat } from "@shared/quiz-types";
import { api } from "../api";
import { DEFAULT_CLASS, isClassId, type ClassId } from "./fuehrerschein";
import { DEFAULT_STATE, getState } from "./lid";

/**
 * Tiến độ tab Lái xe + Leben in Deutschland, lưu trong file trên máy → khách học được, không cần mạng.
 * Đăng nhập: mỗi câu trả lời / đánh dấu / bài thi gửi thêm lên server (/api/v1/quiz — chung với web);
 * mở tab thì tải tiến độ trên server về (server là bản chính). Lần đầu đăng nhập: đẩy tiến độ đã học khi là khách lên.
 */

export type QuizModule = "fuehrerschein" | "lid";
export const MODULES: QuizModule[] = ["fuehrerschein", "lid"];

/** Bài thi lưu trên máy (kèm đáp án để xem lại) */
export type LocalExam = Omit<ExamRecord, "id"> & { id: string; serverId?: number; answers: ExamAnswer[] };

type ModuleData = {
  stats: Record<string, QuizStat>;
  marked: string[];
  exams: LocalExam[];
  /** Bài thi lưu trên server mà máy này không có (làm trên web) — chỉ xem điểm */
  remote: ExamRecord[];
};

export type Prefs = {
  cls: ClassId;
  state: string;
  /** Ngôn ngữ bản dịch câu hỏi */
  lang: Lang;
  trLearn: boolean;
  trExam: boolean;
  /** LiD: làm sai tự đánh dấu ⭐, làm đúng tự bỏ */
  autoMark: boolean;
};

type Data = {
  v: 1;
  /** Tài khoản có tiến độ này: null = khách (chưa đẩy lên server) */
  owner: number | null;
  prefs: Prefs;
  mods: Record<QuizModule, ModuleData>;
  /** Câu đang học dở theo phạm vi (mở lại đúng chỗ) */
  pos: Record<string, string>;
};

const emptyModule = (): ModuleData => ({ stats: {}, marked: [], exams: [], remote: [] });
const DEFAULTS: Data = {
  v: 1,
  owner: null,
  prefs: { cls: DEFAULT_CLASS, state: DEFAULT_STATE, lang: "vi", trLearn: true, trExam: false, autoMark: true },
  mods: { fuehrerschein: emptyModule(), lid: emptyModule() },
  pos: {},
};

const FILE = new File(Paths.document, "quiz-progress.json");
const MAX_EXAMS = 100;

function load(): Data {
  try {
    if (!FILE.exists) return DEFAULTS;
    const d = JSON.parse(FILE.textSync()) as Partial<Data>;
    const p = { ...DEFAULTS.prefs, ...d.prefs };
    return {
      v: 1,
      owner: typeof d.owner === "number" ? d.owner : null,
      prefs: { ...p, cls: isClassId(p.cls) ? p.cls : DEFAULT_CLASS, state: getState(p.state) ? p.state : DEFAULT_STATE, lang: isLang(p.lang) ? p.lang : "vi" },
      mods: { fuehrerschein: { ...emptyModule(), ...d.mods?.fuehrerschein }, lid: { ...emptyModule(), ...d.mods?.lid } },
      pos: d.pos ?? {},
    };
  } catch {
    return DEFAULTS;
  }
}

let data = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function commit(next: Data) {
  data = next;
  listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    FILE.write(JSON.stringify(data)).catch(() => {});
  }, 400);
}

const patchModule = (m: QuizModule, patch: (d: ModuleData) => Partial<ModuleData>) =>
  commit({ ...data, mods: { ...data.mods, [m]: { ...data.mods[m], ...patch(data.mods[m]) } } });

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const useQuizData = () => useSyncExternalStore(subscribe, () => data);
export const useModule = (m: QuizModule) => useSyncExternalStore(subscribe, () => data.mods[m]);
export const usePrefs = () => useSyncExternalStore(subscribe, () => data.prefs);
export const getPrefs = () => data.prefs;
export const getModule = (m: QuizModule) => data.mods[m];

export const setPrefs = (p: Partial<Prefs>) => commit({ ...data, prefs: { ...data.prefs, ...p } });

export const getPos = (key: string) => data.pos[key];
export const setPos = (key: string, qid: string) => {
  if (data.pos[key] !== qid) commit({ ...data, pos: { ...data.pos, [key]: qid } });
};

type UserLike = { id: number } | null;
const quiet = (p: Promise<unknown>) => void p.catch(() => {});

/** Ghi kết quả 1 câu (luyện) */
export function recordAnswer(m: QuizModule, qid: string, ok: boolean, user: UserLike) {
  patchModule(m, (d) => {
    const s = d.stats[qid];
    return { stats: { ...d.stats, [qid]: { correct: (s?.correct ?? 0) + +ok, wrong: (s?.wrong ?? 0) + +!ok, lastOk: ok } } };
  });
  if (user) quiet(api("/quiz", { method: "POST", body: { module: m, answers: [{ qid, ok }] } }));
}

/** Ghi kết quả cả bài thi vào thống kê từng câu (câu bỏ trống không tính) */
function recordMany(m: QuizModule, answers: { qid: string; ok: boolean }[]) {
  patchModule(m, (d) => {
    const stats = { ...d.stats };
    for (const { qid, ok } of answers) {
      const s = stats[qid];
      stats[qid] = { correct: (s?.correct ?? 0) + +ok, wrong: (s?.wrong ?? 0) + +!ok, lastOk: ok };
    }
    return { stats };
  });
}

export function setMarked(m: QuizModule, qid: string, on: boolean, user: UserLike) {
  patchModule(m, (d) => ({ marked: on ? [qid, ...d.marked.filter((x) => x !== qid)] : d.marked.filter((x) => x !== qid) }));
  if (user) quiet(api("/quiz/bookmarks", { method: "POST", body: { module: m, qid, on } }));
}

/** Lưu bài thi vừa nộp (trên máy + server khi đăng nhập) → id trên máy */
export function saveExam(
  m: QuizModule,
  exam: { kind: "random" | "bogen"; ref: string; cls: string; maxErrorPoints: number; durationS: number; answers: ExamAnswer[]; result: ExamResult; results: { qid: string; ok: boolean }[] },
  user: UserLike,
): string {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const { result } = exam;
  const rec: LocalExam = {
    id,
    kind: exam.kind,
    ref: exam.ref,
    cls: exam.cls,
    correct: result.correct,
    total: result.total,
    errorPoints: result.errorPoints,
    maxErrorPoints: exam.maxErrorPoints,
    passed: result.passed,
    failReason: result.failReason,
    durationS: Math.round(exam.durationS),
    at: Date.now(),
    answers: exam.answers,
  };
  patchModule(m, (d) => ({ exams: [rec, ...d.exams].slice(0, MAX_EXAMS) }));
  recordMany(m, exam.results);
  if (user)
    api<{ id: number }>("/quiz/exams", {
      method: "POST",
      body: { module: m, kind: exam.kind, ref: exam.ref, cls: exam.cls, durationS: exam.durationS, answers: exam.answers },
    })
      .then((r) => patchModule(m, (d) => ({ exams: d.exams.map((e) => (e.id === id ? { ...e, serverId: r.id } : e)) })))
      .catch(() => {});
  return id;
}

/** Xoá tiến độ của 1 phần (all: cả câu đánh dấu + lịch sử thi) */
export function resetModule(m: QuizModule, all: boolean, user: UserLike) {
  patchModule(m, () => (all ? emptyModule() : { stats: {} }));
  commit({ ...data, pos: Object.fromEntries(Object.entries(data.pos).filter(([k]) => !k.startsWith(`${m}:`))) });
  if (user) quiet(api("/quiz", { method: "DELETE", body: { module: m, all } }));
}

// ---- Đồng bộ với server ----

let syncing: Promise<void> | null = null;

/** Đẩy tiến độ khi là khách lên tài khoản vừa đăng nhập (chỉ lần đầu) */
async function pushGuest(m: QuizModule) {
  const d = data.mods[m];
  const answers = Object.entries(d.stats).map(([qid, s]) => ({ qid, ok: s.lastOk }));
  for (let i = 0; i < answers.length; i += 100) await api("/quiz", { method: "POST", body: { module: m, answers: answers.slice(i, i + 100) } });
  for (const qid of d.marked) await api("/quiz/bookmarks", { method: "POST", body: { module: m, qid, on: true } });
}

/** Tải tiến độ trên server về (gọi khi mở tab Lái xe / LiD). Mất mạng thì giữ bản trên máy */
export function syncQuiz(user: UserLike): Promise<void> {
  if (!user) return Promise.resolve();
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      if (data.owner === null) {
        for (const m of MODULES) await pushGuest(m);
        commit({ ...data, owner: user.id });
      } else if (data.owner !== user.id) {
        // Tài khoản khác đã dùng máy này: bỏ tiến độ của tài khoản cũ (vẫn còn trên server của họ)
        commit({ ...data, owner: user.id, mods: { fuehrerschein: emptyModule(), lid: emptyModule() }, pos: {} });
      }
      for (const m of MODULES) {
        const [s, b, e] = await Promise.all([
          api<{ stats: Record<string, QuizStat> }>(`/quiz?module=${m}`),
          api<{ ids: string[] }>(`/quiz/bookmarks?module=${m}`),
          api<{ exams: ExamRecord[] }>(`/quiz/exams?module=${m}`),
        ]);
        patchModule(m, (d) => {
          const mine = new Set(d.exams.map((x) => x.serverId).filter(Boolean));
          return { stats: s.stats, marked: b.ids, remote: e.exams.filter((x) => !mine.has(x.id)) };
        });
      }
    } catch {
      // mất mạng / server lỗi: lần mở tab sau thử lại
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}
