import { grade, isRight, type DrivingQ, type ExamResult } from "@shared/laixe/rules";
import * as fs from "./fuehrerschein";
import * as lid from "./lid";
import { getModule, getPrefs, type QuizModule, type RemoteExamDetail } from "./store";
import { l } from "./strings";

/**
 * Màn làm bài (/quiz/run) nhận module + mode + scope:
 * - lesen / ueben: phạm vi học, "wrong", "wrong-last", "marked", hoặc "bogen:<n>" (lái xe)
 * - exam: "random" | "bogen:<n>"
 * - review: id bài thi trên máy hoặc "remote:<serverId>"
 */
export type RunMode = "lesen" | "ueben" | "exam" | "review";
export const isRunMode = (v: unknown): v is RunMode => v === "lesen" || v === "ueben" || v === "exam" || v === "review";

export type ExamSetup = { kind: "random" | "bogen"; ref: string; cls: string; minutes: number; maxErrorPoints: number };

export type Run = {
  title: string;
  subtitle: string;
  questions: DrivingQ[];
  scope: string;
  canSwitchMode?: boolean;
  exam?: ExamSetup;
  review?: { picked: Record<string, string[]>; result: ExamResult; maxErrorPoints: number; exam: ExamSetup };
  resumeKey?: string;
};

const wrongIds = (m: QuizModule, pool: string[]) => {
  const { stats } = getModule(m);
  return pool.filter((id) => stats[id] && !stats[id].lastOk);
};
const markedIds = (m: QuizModule, pool: Set<string>) => getModule(m).marked.filter((id) => pool.has(id));

export function buildRunFromRemoteExam(m: QuizModule, rec: RemoteExamDetail): Run {
  const load = (ids: string[], orders?: Record<string, number[]>) => (m === "lid" ? lid.questions(ids) : fs.questions(ids, orders));
  const orders = Object.fromEntries(rec.answers.map((a) => [a.qid, a.order]));
  const picked = Object.fromEntries(rec.answers.map((a) => [a.qid, a.picked]));
  const qs = load(rec.answers.map((a) => a.qid), orders);
  const exam: ExamSetup = { kind: rec.kind, ref: rec.ref, cls: rec.cls, minutes: 0, maxErrorPoints: rec.maxErrorPoints };
  return {
    title: examTitle(m, exam),
    subtitle: l("Xem lại bài thi", "Prüfung ansehen"),
    questions: qs,
    scope: `remote:${rec.id}`,
    review: { picked, result: grade(qs, picked, rec.maxErrorPoints), maxErrorPoints: rec.maxErrorPoints, exam },
  };
}

export function buildWrongLastFromRemoteExam(m: QuizModule, rec: RemoteExamDetail): Run {
  const load = (ids: string[], orders?: Record<string, number[]>) => (m === "lid" ? lid.questions(ids) : fs.questions(ids, orders));
  const orders = Object.fromEntries(rec.answers.map((a) => [a.qid, a.order]));
  const pickedMap = new Map(rec.answers.map((a) => [a.qid, a.picked]));
  const qs = load(rec.answers.map((a) => a.qid), orders);
  const badIds = qs.filter((q) => !isRight(q, pickedMap.get(q.id))).map((q) => q.id);
  const exam: ExamSetup = { kind: rec.kind, ref: rec.ref, cls: rec.cls, minutes: 0, maxErrorPoints: rec.maxErrorPoints };
  return {
    title: l("Câu sai bài gần nhất", "Fehler der letzten Prüfung"),
    subtitle: examTitle(m, exam),
    questions: load(badIds, orders),
    scope: "wrong-last",
  };
}

export function buildRun(m: QuizModule, mode: RunMode, scope: string): Run | null {
  const prefs = getPrefs();
  const load = (ids: string[], orders?: Record<string, number[]>) => (m === "lid" ? lid.questions(ids) : fs.questions(ids, orders));

  if (mode === "review") {
    const rec = getModule(m).exams.find((e) => e.id === scope);
    if (!rec) return null;
    const orders = Object.fromEntries(rec.answers.map((a) => [a.qid, a.order]));
    const picked = Object.fromEntries(rec.answers.map((a) => [a.qid, a.picked]));
    const qs = load(rec.answers.map((a) => a.qid), orders);
    const exam: ExamSetup = { kind: rec.kind, ref: rec.ref, cls: rec.cls, minutes: 0, maxErrorPoints: rec.maxErrorPoints };
    return {
      title: examTitle(m, exam),
      subtitle: l("Xem lại bài thi", "Prüfung ansehen"),
      questions: qs,
      scope,
      review: { picked, result: grade(qs, picked, rec.maxErrorPoints), maxErrorPoints: rec.maxErrorPoints, exam },
    };
  }

  if (mode === "exam") {
    if (m === "lid") {
      const exam: ExamSetup = { kind: "random", ref: prefs.state, cls: prefs.state, minutes: lid.EXAM.minutes, maxErrorPoints: lid.EXAM_MAX_WRONG };
      return { title: examTitle(m, exam), subtitle: lid.getState(prefs.state)?.name ?? "", questions: load(lid.examQuestionIds(prefs.state)), scope, exam };
    }
    const bogen = scope.match(/^bogen:(\d+)$/);
    if (bogen) {
      const ids = fs.bogenIds(Number(bogen[1]));
      if (!ids) return null;
      const exam: ExamSetup = { kind: "bogen", ref: bogen[1], cls: "B", minutes: fs.classInfo("B").exam.minutes, maxErrorPoints: fs.classInfo("B").exam.maxErrorPoints };
      return { title: examTitle(m, exam), subtitle: "Klasse B", questions: load(ids), scope, exam };
    }
    const info = fs.classInfo(prefs.cls);
    const exam: ExamSetup = { kind: "random", ref: prefs.cls, cls: prefs.cls, minutes: info.exam.minutes, maxErrorPoints: info.exam.maxErrorPoints };
    return { title: examTitle(m, exam), subtitle: `Klasse ${prefs.cls}`, questions: load(fs.examQuestionIds(prefs.cls)), scope, exam };
  }

  // Học: đọc / luyện
  if (m === "fuehrerschein") {
    const bogen = scope.match(/^bogen:(\d+)$/);
    if (bogen) {
      const ids = fs.bogenIds(Number(bogen[1]));
      if (!ids) return null;
      return { title: l(`Đề mẫu ${bogen[1]}`, `Musterbogen ${bogen[1]}`), subtitle: "Klasse B", questions: load(ids), scope, canSwitchMode: true, resumeKey: `${m}:bogen:${bogen[1]}` };
    }
  }

  const pool = m === "lid" ? lid.getSet("hoc", prefs.state)!.ids : fs.classQuestionIds(prefs.cls);
  if (scope === "wrong") return { title: l("Câu đang sai", "Falsch beantwortet"), subtitle: "", questions: load(wrongIds(m, pool)), scope };
  if (scope === "wrong-last" || scope.startsWith("wrong-exam:")) {
    const targetId = scope.startsWith("wrong-exam:") ? scope.slice(11) : null;
    const examRec = targetId ? getModule(m).exams.find((e) => e.id === targetId) : getModule(m).exams[0];
    if (!examRec) return { title: l("Câu sai bài thi", "Fehler der Prüfung"), subtitle: "", questions: [], scope };
    const orders = Object.fromEntries(examRec.answers.map((a) => [a.qid, a.order]));
    const pickedMap = new Map(examRec.answers.map((a) => [a.qid, a.picked]));
    const qs = load(examRec.answers.map((a) => a.qid), orders);
    const badIds = qs.filter((q) => !isRight(q, pickedMap.get(q.id))).map((q) => q.id);
    return { title: l("Câu sai bài thi", "Fehler der Prüfung"), subtitle: examTitle(m, examRec), questions: load(badIds, orders), scope };
  }
  if (scope === "marked") return { title: l("Câu đã đánh dấu", "Markierte Fragen"), subtitle: "", questions: load(markedIds(m, new Set(pool))), scope, canSwitchMode: true, resumeKey: `${m}:marked` };

  const set = m === "lid" ? lid.getSet(scope, prefs.state) : fs.scopeQuestions(scope, prefs.cls);
  if (!set) return null;
  const key = m === "lid" ? `${m}:${scope === "state" ? prefs.state : scope}` : `${m}:${prefs.cls}:${scope}`;
  return { title: set.title, subtitle: set.subtitle, questions: load(set.ids), scope, canSwitchMode: true, resumeKey: key };
}

export function examTitle(m: QuizModule, e: Pick<ExamSetup, "kind" | "ref" | "cls">) {
  if (m === "lid") return l(`Thi thử · ${lid.getState(e.cls)?.name ?? e.cls}`, `Testprüfung · ${lid.getState(e.cls)?.name ?? e.cls}`);
  return e.kind === "bogen" ? l(`Đề mẫu ${e.ref}`, `Musterbogen ${e.ref}`) : l(`Thi thử hạng ${e.cls}`, `Testprüfung Klasse ${e.cls}`);
}
