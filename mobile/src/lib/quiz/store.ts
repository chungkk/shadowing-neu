import { useSyncExternalStore } from "react";
import { File, Paths } from "expo-file-system";
import { isLang, type ExamAnswer, type ExamRecord, type ExamResult, type Lang } from "@shared/laixe/rules";
import type { QuizStat } from "@shared/quiz/types";
import { ApiError, api } from "../api";
import type { ClassId } from "./fuehrerschein";
import { DEFAULT_CLASS, DEFAULT_STATE, isClassId, isStateCode } from "./ids";

/**
 * Tiến độ tab Lái xe + Leben in Deutschland, lưu trong file trên máy → khách học được, không cần mạng.
 * Đăng nhập: mỗi câu trả lời / đánh dấu / bài thi / xoá tiến độ vào hàng đợi `outbox` (lưu cùng file) rồi gửi lên
 * server (/api/v1/quiz — chung với web). Mục chỉ rời hàng đợi khi server nhận → mất mạng không mất kết quả.
 * Mở tab: gửi hết hàng đợi trước, rồi mới tải tiến độ trên server về (server là bản chính).
 * Lần đầu đăng nhập: tiến độ khi là khách cũng đi qua hàng đợi.
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

/** Việc chờ gửi lên server, gửi lần lượt theo thứ tự */
type OutItem =
  | { m: QuizModule; t: "answers"; answers: { qid: string; ok: boolean }[] }
  | { m: QuizModule; t: "mark"; qid: string; on: boolean }
  /** Bài thi trên máy (theo id) chưa có serverId */
  | { m: QuizModule; t: "exam"; id: string }
  | { m: QuizModule; t: "reset"; all: boolean };

type Data = {
  v: 1;
  /** Tài khoản có tiến độ này: null = khách (chưa đẩy lên server) */
  owner: number | null;
  prefs: Prefs;
  mods: Record<QuizModule, ModuleData>;
  /** Câu đang học dở theo phạm vi (mở lại đúng chỗ) */
  pos: Record<string, string>;
  outbox: OutItem[];
};

const emptyModule = (): ModuleData => ({ stats: {}, marked: [], exams: [], remote: [] });
const DEFAULTS: Data = {
  v: 1,
  owner: null,
  prefs: { cls: DEFAULT_CLASS, state: DEFAULT_STATE, lang: "vi", trLearn: true, trExam: false, autoMark: true },
  mods: { fuehrerschein: emptyModule(), lid: emptyModule() },
  pos: {},
  outbox: [],
};

const FILE = new File(Paths.document, "quiz-progress.json");
const MAX_EXAMS = 100;

function load(): Data {
  try {
    if (!FILE.exists) return DEFAULTS;
    const d = JSON.parse(FILE.textSync()) as Partial<Data>;
    const p = { ...DEFAULTS.prefs, ...d.prefs };
    const owner = typeof d.owner === "number" ? d.owner : null;
    // File cũ (chưa có hàng đợi): bài thi của tài khoản chưa lên server được → gửi lại
    const legacy: OutItem[] =
      owner !== null && !Array.isArray(d.outbox)
        ? MODULES.flatMap((m) => (d.mods?.[m]?.exams ?? []).filter((e) => !e.serverId).reverse().map((e) => ({ m, t: "exam" as const, id: e.id })))
        : [];
    return {
      v: 1,
      owner,
      prefs: { ...p, cls: isClassId(p.cls) ? p.cls : DEFAULT_CLASS, state: isStateCode(p.state) ? p.state : DEFAULT_STATE, lang: isLang(p.lang) ? p.lang : "vi" },
      mods: { fuehrerschein: { ...emptyModule(), ...d.mods?.fuehrerschein }, lid: { ...emptyModule(), ...d.mods?.lid } },
      pos: d.pos ?? {},
      outbox: Array.isArray(d.outbox) ? d.outbox : legacy,
    };
  } catch {
    return DEFAULTS;
  }
}

let data = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const save = () => {
  saveTimer = null;
  FILE.write(JSON.stringify(data)).catch(() => {});
};

/** Ghi file ngay (đồng bộ) — dùng cho việc không được mất khi app bị tắt ngay sau đó */
const saveNow = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  try {
    FILE.writeSync(JSON.stringify(data));
  } catch {
    // hết chỗ / lỗi ghi: lần commit sau ghi lại
  }
};

function commit(next: Data) {
  data = next;
  listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
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

/** Hàng đợi chỉ dành cho tài khoản sở hữu tiến độ trên máy (owner === null: chưa đồng bộ lần đầu, syncQuiz sẽ đẩy) */
function enqueue(item: OutItem, user: UserLike) {
  if (!user || data.owner !== user.id) return;
  const box = data.outbox;
  const last = box[box.length - 1];
  // Gộp các câu trả lời liên tiếp của cùng phần (server nhận tối đa 100 câu / lần)
  if (item.t === "answers" && last?.t === "answers" && last.m === item.m && last.answers.length + item.answers.length <= 100)
    commit({ ...data, outbox: [...box.slice(0, -1), { ...last, answers: [...last.answers, ...item.answers] }] });
  else commit({ ...data, outbox: [...box, item] });
  void flush(user);
}

/** Lỗi không thử lại được (dữ liệu không hợp lệ với server): bỏ mục đó để không chặn cả hàng đợi */
const permanent = (e: unknown) => e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status);

async function send(item: OutItem) {
  const m = item.m;
  if (item.t === "answers") await api("/quiz", { method: "POST", body: { module: m, answers: item.answers } });
  else if (item.t === "mark") await api("/quiz/bookmarks", { method: "POST", body: { module: m, qid: item.qid, on: item.on } });
  else if (item.t === "reset") await api("/quiz", { method: "DELETE", body: { module: m, all: item.all } });
  else {
    const e = data.mods[m].exams.find((x) => x.id === item.id);
    if (!e || e.serverId) return; // đã xoá / đã gửi
    const r = await api<{ id: number }>("/quiz/exams", {
      method: "POST",
      body: { module: m, kind: e.kind, ref: e.ref, cls: e.cls, durationS: e.durationS, answers: e.answers },
    });
    patchModule(m, (d) => ({ exams: d.exams.map((x) => (x.id === item.id ? { ...x, serverId: r.id } : x)) }));
  }
}

let flushing: Promise<boolean> | null = null;

/** Gửi lần lượt hàng đợi; lỗi mạng / server thì dừng, giữ phần còn lại cho lần sau. true = đã gửi hết */
function flush(user: UserLike): Promise<boolean> {
  if (!user || data.owner !== user.id) return Promise.resolve(false);
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      while (data.outbox.length && data.owner === user.id) {
        const item = data.outbox[0];
        try {
          await send(item);
        } catch (e) {
          if (!permanent(e)) return false;
        }
        // Mục đầu có thể vừa được gộp thêm câu trả lời trong lúc gửi → chỉ bỏ đúng phần đã gửi
        const head = data.outbox[0];
        if (head === item) commit({ ...data, outbox: data.outbox.slice(1) });
        else if (head?.t === "answers" && item.t === "answers" && head.m === item.m)
          commit({ ...data, outbox: [{ ...head, answers: head.answers.slice(item.answers.length) }, ...data.outbox.slice(1)] });
      }
      return !data.outbox.length;
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** Ghi kết quả 1 câu (luyện) */
export function recordAnswer(m: QuizModule, qid: string, ok: boolean, user: UserLike) {
  patchModule(m, (d) => {
    const s = d.stats[qid];
    return { stats: { ...d.stats, [qid]: { correct: (s?.correct ?? 0) + +ok, wrong: (s?.wrong ?? 0) + +!ok, lastOk: ok } } };
  });
  enqueue({ m, t: "answers", answers: [{ qid, ok }] }, user);
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
  enqueue({ m, t: "mark", qid, on }, user);
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
  enqueue({ m, t: "exam", id }, user);
  saveNow(); // bài thi vừa nộp: ghi file ngay, không chờ debounce
  return id;
}

/** Xoá tiến độ của 1 phần (all: cả câu đánh dấu + lịch sử thi) */
export function resetModule(m: QuizModule, all: boolean, user: UserLike) {
  patchModule(m, () => (all ? emptyModule() : { stats: {} }));
  commit({ ...data, pos: Object.fromEntries(Object.entries(data.pos).filter(([k]) => !k.startsWith(`${m}:`))) });
  // Câu trả lời chờ gửi của phần này không còn ý nghĩa sau khi xoá; chỉ xoá thống kê thì vẫn gửi đánh dấu + bài thi (lịch sử còn)
  commit({ ...data, outbox: data.outbox.filter((i) => i.m !== m || (!all && i.t !== "answers")) });
  enqueue({ m, t: "reset", all }, user);
}

// ---- Đồng bộ với server ----

let syncing: Promise<void> | null = null;

/** Tiến độ khi là khách → hàng đợi của tài khoản vừa đăng nhập (chỉ lần đầu). Bài thi khi là khách vẫn chỉ ở trên máy */
function adoptGuest(userId: number) {
  const outbox: OutItem[] = [...data.outbox];
  for (const m of MODULES) {
    const d = data.mods[m];
    const answers = Object.entries(d.stats).map(([qid, s]) => ({ qid, ok: s.lastOk }));
    for (let i = 0; i < answers.length; i += 100) outbox.push({ m, t: "answers", answers: answers.slice(i, i + 100) });
    for (const qid of d.marked) outbox.push({ m, t: "mark", qid, on: true });
  }
  commit({ ...data, owner: userId, outbox });
  saveNow();
}

/** Gửi hàng đợi rồi tải tiến độ trên server về (gọi khi mở tab Lái xe / LiD). Mất mạng thì giữ bản trên máy */
// Mở lại tab trong vòng 60 giây: chỉ gửi hàng đợi, không tải lại 6 API (kéo để làm mới = force)
const PULL_EVERY_MS = 60_000;
let lastPull: { user: number; at: number } | null = null;

export function syncQuiz(user: UserLike, opts?: { force?: boolean }): Promise<void> {
  if (!user) return Promise.resolve();
  if (syncing) return syncing;
  if (!opts?.force && lastPull?.user === user.id && Date.now() - lastPull.at < PULL_EVERY_MS && data.owner === user.id) {
    return data.outbox.length ? flush(user).then(() => {}, () => {}) : Promise.resolve();
  }
  syncing = (async () => {
    try {
      if (data.owner === null) adoptGuest(user.id);
      else if (data.owner !== user.id) {
        // Tài khoản khác đã dùng máy này: bỏ tiến độ + hàng đợi của tài khoản cũ (vẫn còn trên server của họ)
        commit({ ...data, owner: user.id, mods: { fuehrerschein: emptyModule(), lid: emptyModule() }, pos: {}, outbox: [] });
      }
      // Chưa gửi hết thì không lấy bản server về: sẽ ghi đè kết quả chưa gửi
      if (!(await flush(user))) return;
      for (const m of MODULES) {
        const [s, b, e] = await Promise.all([
          api<{ stats: Record<string, QuizStat> }>(`/quiz?module=${m}`),
          api<{ ids: string[] }>(`/quiz/bookmarks?module=${m}`),
          api<{ exams: ExamRecord[] }>(`/quiz/exams?module=${m}`),
        ]);
        // Có việc mới vào hàng đợi trong lúc tải: giữ bản trên máy, lần sau đồng bộ lại
        if (data.owner !== user.id || data.outbox.some((i) => i.m === m)) continue;
        patchModule(m, (d) => {
          const mine = new Set(d.exams.map((x) => x.serverId).filter(Boolean));
          return { stats: s.stats, marked: b.ids, remote: e.exams.filter((x) => !mine.has(x.id)) };
        });
      }
      lastPull = { user: user.id, at: Date.now() };
    } catch {
      // mất mạng / server lỗi: lần mở tab sau thử lại
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}
