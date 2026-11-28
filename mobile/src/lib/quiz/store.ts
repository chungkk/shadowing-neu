import { useSyncExternalStore } from "react";
import { File, Paths } from "expo-file-system";
import { isLang, type ExamAnswer, type ExamRecord, type ExamResult, type Lang } from "@shared/laixe/rules";
import type { QuizStat } from "@shared/quiz/types";
import { ApiError, api } from "../api";
import type { ClassId } from "./fuehrerschein";
import { DEFAULT_CLASS, DEFAULT_STATE, isClassId, isStateCode } from "./ids";

export type QuizModule = "fuehrerschein" | "lid";
export const MODULES: QuizModule[] = ["fuehrerschein", "lid"];

/** Bài thi lưu trên máy (kèm đáp án để xem lại) */
export type LocalExam = Omit<ExamRecord, "id"> & { id: string; serverId?: number; answers: ExamAnswer[] };

export type RemoteExamDetail = ExamRecord & { answers: ExamAnswer[] };

type ModuleData = {
  stats: Record<string, QuizStat>;
  marked: string[];
  exams: LocalExam[];
  remote: ExamRecord[];
};

export type Prefs = {
  cls: ClassId;
  state: string;
  stateChosen?: boolean;
  lang: Lang;
  trLearn: boolean;
  trExam: boolean;
  autoMark: boolean;
};

type OutItem =
  | { m: QuizModule; t: "answers"; answers: { qid: string; ok: boolean }[] }
  | { m: QuizModule; t: "mark"; qid: string; on: boolean }
  | { m: QuizModule; t: "exam"; id: string }
  | { m: QuizModule; t: "reset"; all: boolean }
  | { m: QuizModule; t: "pref"; cls?: ClassId; state?: string };

type Data = {
  v: 1;
  owner: number | null;
  prefs: Prefs;
  mods: Record<QuizModule, ModuleData>;
  pos: Record<string, string>;
  outbox: OutItem[];
};

const emptyModule = (): ModuleData => ({ stats: {}, marked: [], exams: [], remote: [] });
const DEFAULTS: Data = {
  v: 1,
  owner: null,
  prefs: { cls: DEFAULT_CLASS, state: DEFAULT_STATE, stateChosen: false, lang: "vi", trLearn: true, trExam: false, autoMark: true },
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
    const legacy: OutItem[] =
      owner !== null && !Array.isArray(d.outbox)
        ? MODULES.flatMap((m) => (d.mods?.[m]?.exams ?? []).filter((e) => !e.serverId).reverse().map((e) => ({ m, t: "exam" as const, id: e.id })))
        : [];
    return {
      v: 1,
      owner,
      prefs: {
        ...p,
        cls: isClassId(p.cls) ? p.cls : DEFAULT_CLASS,
        state: isStateCode(p.state) ? p.state : DEFAULT_STATE,
        stateChosen: !!p.stateChosen,
        lang: isLang(p.lang) ? p.lang : "vi",
      },
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

const saveNow = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  try {
    FILE.writeSync(JSON.stringify(data));
  } catch {}
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
export const getQuizOwner = () => data.owner;

export const setPrefs = (p: Partial<Prefs>, user?: UserLike) => {
  commit({ ...data, prefs: { ...data.prefs, ...p } });
  if (user && (p.cls !== undefined || p.state !== undefined)) {
    enqueue(
      {
        m: p.state !== undefined ? "lid" : "fuehrerschein",
        t: "pref",
        ...(p.cls !== undefined ? { cls: p.cls } : {}),
        ...(p.state !== undefined ? { state: p.state } : {}),
      },
      user,
    );
  }
};

export const getPos = (key: string) => data.pos[key];
export const setPos = (key: string, qid: string) => {
  if (data.pos[key] !== qid) commit({ ...data, pos: { ...data.pos, [key]: qid } });
};

type UserLike = { id: number } | null;

function enqueue(item: OutItem, user: UserLike) {
  if (!user) return;
  if (data.owner === null) adoptGuest(user.id);
  if (data.owner !== user.id) return;
  const box = data.outbox;
  const last = box[box.length - 1];
  if (item.t === "answers" && last?.t === "answers" && last.m === item.m && last.answers.length + item.answers.length <= 100)
    commit({ ...data, outbox: [...box.slice(0, -1), { ...last, answers: [...last.answers, ...item.answers] }] });
  else commit({ ...data, outbox: [...box, item] });
  void flush(user);
}

const permanent = (e: unknown) => e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 403, 408, 429].includes(e.status);

async function send(item: OutItem) {
  const m = item.m;
  if (item.t === "answers") await api("/quiz", { method: "POST", body: { module: m, answers: item.answers } });
  else if (item.t === "mark") await api("/quiz/bookmarks", { method: "POST", body: { module: m, qid: item.qid, on: item.on } });
  else if (item.t === "reset") await api("/quiz", { method: "DELETE", body: { module: m, all: item.all } });
  else if (item.t === "pref") {
    await api("/quiz/prefs", {
      method: "PUT",
      body: {
        ...(item.cls !== undefined ? { cls: item.cls } : {}),
        ...(item.state !== undefined ? { state: item.state } : {}),
      },
    });
  } else {
    const e = data.mods[m].exams.find((x) => x.id === item.id);
    if (!e || e.serverId) return;
    const r = await api<{ id: number }>("/quiz/exams", {
      method: "POST",
      body: { module: m, kind: e.kind, ref: e.ref, cls: e.cls, durationS: e.durationS, answers: e.answers },
    });
    patchModule(m, (d) => ({ exams: d.exams.map((x) => (x.id === item.id ? { ...x, serverId: r.id } : x)) }));
  }
}

let flushing: Promise<boolean> | null = null;

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

export function recordAnswer(m: QuizModule, qid: string, ok: boolean, user: UserLike) {
  patchModule(m, (d) => {
    const s = d.stats[qid];
    return { stats: { ...d.stats, [qid]: { correct: (s?.correct ?? 0) + +ok, wrong: (s?.wrong ?? 0) + +!ok, lastOk: ok } } };
  });
  enqueue({ m, t: "answers", answers: [{ qid, ok }] }, user);
}

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
  saveNow();
  return id;
}

export function resetModule(m: QuizModule, all: boolean, user: UserLike) {
  patchModule(m, () => (all ? emptyModule() : { stats: {} }));
  commit({ ...data, pos: Object.fromEntries(Object.entries(data.pos).filter(([k]) => !k.startsWith(`${m}:`))) });
  commit({ ...data, outbox: data.outbox.filter((i) => i.m !== m || (!all && i.t !== "answers")) });
  enqueue({ m, t: "reset", all }, user);
}

const remoteExamCache = new Map<string, RemoteExamDetail>();

/** Tải chi tiết 1 bài thi từ server (bài thi làm trên Web) để xem lại trên iOS */
export async function fetchRemoteExam(m: QuizModule, serverId: number): Promise<RemoteExamDetail> {
  const key = `${m}:${serverId}`;
  const hit = remoteExamCache.get(key);
  if (hit) return hit;
  const res = await api<{ exam: RemoteExamDetail }>(`/quiz/exams/${serverId}?module=${m}`);
  remoteExamCache.set(key, res.exam);
  return res.exam;
}

// ---- Đồng bộ với server ----

let syncing: Promise<void> | null = null;

function adoptGuest(userId: number) {
  const outbox: OutItem[] = [...data.outbox];
  for (const m of MODULES) {
    const d = data.mods[m];
    const pendingExams = [...d.exams].reverse().filter((e) => !e.serverId);
    const examAnswerCount = new Map<string, number>();
    for (const e of pendingExams) {
      outbox.push({ m, t: "exam", id: e.id });
      for (const a of e.answers) {
        if (a.picked.length > 0) examAnswerCount.set(a.qid, (examAnswerCount.get(a.qid) ?? 0) + 1);
      }
    }
    const answers = Object.entries(d.stats)
      .filter(([qid, s]) => s.correct + s.wrong > (examAnswerCount.get(qid) ?? 0))
      .map(([qid, s]) => ({ qid, ok: s.lastOk }));
    for (let i = 0; i < answers.length; i += 100) outbox.push({ m, t: "answers", answers: answers.slice(i, i + 100) });
    for (const qid of d.marked) outbox.push({ m, t: "mark", qid, on: true });
  }
  commit({ ...data, owner: userId, outbox });
  saveNow();
}

export function clearQuizOnLogout() {
  remoteExamCache.clear();
  lastPull = null;
  commit({
    ...data,
    owner: null,
    prefs: { ...data.prefs, cls: DEFAULT_CLASS, state: DEFAULT_STATE, stateChosen: false },
    mods: { fuehrerschein: emptyModule(), lid: emptyModule() },
    pos: {},
    outbox: [],
  });
  saveNow();
}

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
      const wasGuest = data.owner === null;
      const guestPrefs = wasGuest ? { ...data.prefs } : null;
      if (wasGuest) adoptGuest(user.id);
      else if (data.owner !== user.id) {
        remoteExamCache.clear();
        commit({
          ...data,
          owner: user.id,
          prefs: { ...data.prefs, cls: DEFAULT_CLASS, state: DEFAULT_STATE, stateChosen: false },
          mods: { fuehrerschein: emptyModule(), lid: emptyModule() },
          pos: {},
          outbox: [],
        });
      }
      if (!(await flush(user))) return;

      // Đồng bộ hạng bằng lái & bang LiD từ server (hoặc đẩy lựa chọn của khách lên tài khoản mới)
      const prefsRes = await api<{ cls: string | null; state: string | null }>("/quiz/prefs").catch(() => null);
      if (prefsRes) {
        const nextPrefs: Partial<Prefs> = {};
        if (prefsRes.cls && isClassId(prefsRes.cls)) nextPrefs.cls = prefsRes.cls;
        if (prefsRes.state && isStateCode(prefsRes.state)) {
          nextPrefs.state = prefsRes.state;
          nextPrefs.stateChosen = true;
        }
        if (Object.keys(nextPrefs).length) setPrefs(nextPrefs);
        if (guestPrefs) {
          const uploadCls = !prefsRes.cls ? guestPrefs.cls : undefined;
          const uploadState = !prefsRes.state && guestPrefs.stateChosen ? guestPrefs.state : undefined;
          if (uploadCls || uploadState) {
            setPrefs({ ...(uploadCls ? { cls: uploadCls } : {}), ...(uploadState ? { state: uploadState } : {}) }, user);
          }
        }
      }

      for (const m of MODULES) {
        const [s, b, e] = await Promise.all([
          api<{ stats: Record<string, QuizStat> }>(`/quiz?module=${m}`),
          api<{ ids: string[] }>(`/quiz/bookmarks?module=${m}`),
          api<{ exams: ExamRecord[] }>(`/quiz/exams?module=${m}`),
        ]);
        if (data.owner !== user.id || data.outbox.some((i) => i.m === m && i.t !== "pref")) continue;
        patchModule(m, (d) => {
          const serverIds = new Set(e.exams.map((x) => x.id));
          const keptExams = d.exams.filter((x) => !x.serverId || serverIds.has(x.serverId));
          const mine = new Set(keptExams.map((x) => x.serverId).filter(Boolean));
          return { stats: s.stats, marked: b.ids, exams: keptExams, remote: e.exams.filter((x) => !mine.has(x.id)) };
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
