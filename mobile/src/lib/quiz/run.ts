import { grade, type DrivingQ, type ExamResult } from "@shared/laixe/rules";
import * as fs from "./fuehrerschein";
import * as lid from "./lid";
import { getModule, getPrefs, type QuizModule } from "./store";
import { l } from "./strings";

/**
 * Màn làm bài (/quiz/run) nhận module + mode + scope, dựng đề 1 lần lúc mở màn:
 * - lesen / ueben: scope = phạm vi học (lái xe: "all" | "grund" | "zusatz" | chủ đề | chương; LiD: bộ câu getSet)
 *   hoặc "wrong" (câu đang sai) / "marked" (câu đã đánh dấu)
 * - exam: scope = "random" | "bogen:<n>" (đề mẫu hạng B)
 * - review: scope = id bài thi lưu trên máy
 */
export type RunMode = "lesen" | "ueben" | "exam" | "review";
export const isRunMode = (v: unknown): v is RunMode => v === "lesen" || v === "ueben" || v === "exam" || v === "review";

export type ExamSetup = { kind: "random" | "bogen"; ref: string; cls: string; minutes: number; maxErrorPoints: number };

export type Run = {
  title: string;
  subtitle: string;
  questions: DrivingQ[];
  exam?: ExamSetup;
  review?: { picked: Record<string, string[]>; result: ExamResult; maxErrorPoints: number; exam: ExamSetup };
  /** Nhớ câu đang học (mở lại đúng chỗ) */
  resumeKey?: string;
};

const wrongIds = (m: QuizModule, pool: string[]) => {
  const { stats } = getModule(m);
  return pool.filter((id) => stats[id] && !stats[id].lastOk);
};
const markedIds = (m: QuizModule, pool: Set<string>) => getModule(m).marked.filter((id) => pool.has(id));

export function buildRun(m: QuizModule, mode: RunMode, scope: string): Run | null {
  const prefs = getPrefs();
  const load = (ids: string[], orders?: Record<string, number[]>) => (m === "lid" ? lid.questions(ids) : fs.questions(ids, orders));

  if (mode === "review") {
    const rec = getModule(m).exams.find((e) => e.id === scope);
    if (!rec) return null;
    const orders = Object.fromEntries(rec.answers.map((a) => [a.qid, a.order]));
    const picked = Object.fromEntries(rec.answers.map((a) => [a.qid, a.picked]));
    const questions = load(rec.answers.map((a) => a.qid), orders);
    const exam: ExamSetup = { kind: rec.kind, ref: rec.ref, cls: rec.cls, minutes: 0, maxErrorPoints: rec.maxErrorPoints };
    return {
      title: examTitle(m, exam),
      subtitle: l("Xem lại bài thi", "Prüfung ansehen"),
      questions,
      review: { picked, result: grade(questions, picked, rec.maxErrorPoints), maxErrorPoints: rec.maxErrorPoints, exam },
    };
  }

  if (mode === "exam") {
    if (m === "lid") {
      const exam: ExamSetup = { kind: "random", ref: prefs.state, cls: prefs.state, minutes: lid.EXAM.minutes, maxErrorPoints: lid.EXAM_MAX_WRONG };
      return { title: examTitle(m, exam), subtitle: lid.getState(prefs.state)?.name ?? "", questions: load(lid.examQuestionIds(prefs.state)), exam };
    }
    const bogen = scope.match(/^bogen:(\d+)$/);
    if (bogen) {
      const ids = fs.bogenIds(Number(bogen[1]));
      if (!ids) return null;
      const exam: ExamSetup = { kind: "bogen", ref: bogen[1], cls: "B", minutes: fs.classInfo("B").exam.minutes, maxErrorPoints: fs.classInfo("B").exam.maxErrorPoints };
      return { title: examTitle(m, exam), subtitle: "Klasse B", questions: load(ids), exam };
    }
    const info = fs.classInfo(prefs.cls);
    const exam: ExamSetup = { kind: "random", ref: prefs.cls, cls: prefs.cls, minutes: info.exam.minutes, maxErrorPoints: info.exam.maxErrorPoints };
    return { title: examTitle(m, exam), subtitle: `Klasse ${prefs.cls}`, questions: load(fs.examQuestionIds(prefs.cls)), exam };
  }

  // Học: đọc / luyện
  const pool = m === "lid" ? lid.getSet("hoc", prefs.state)!.ids : fs.classQuestionIds(prefs.cls);
  if (scope === "wrong") return { title: l("Câu đang sai", "Falsch beantwortet"), subtitle: "", questions: load(wrongIds(m, pool)) };
  if (scope === "marked") return { title: l("Câu đã đánh dấu", "Markierte Fragen"), subtitle: "", questions: load(markedIds(m, new Set(pool))) };
  const set = m === "lid" ? lid.getSet(scope, prefs.state) : fs.scopeQuestions(scope, prefs.cls);
  if (!set) return null;
  const key = m === "lid" ? `${m}:${scope === "state" ? prefs.state : scope}` : `${m}:${prefs.cls}:${scope}`;
  return { title: set.title, subtitle: set.subtitle, questions: load(set.ids), resumeKey: key };
}

export function examTitle(m: QuizModule, e: Pick<ExamSetup, "kind" | "ref" | "cls">) {
  if (m === "lid") return l(`Thi thử · ${lid.getState(e.cls)?.name ?? e.cls}`, `Testprüfung · ${lid.getState(e.cls)?.name ?? e.cls}`);
  return e.kind === "bogen" ? l(`Đề mẫu ${e.ref}`, `Musterbogen ${e.ref}`) : l(`Thi thử hạng ${e.cls}`, `Testprüfung Klasse ${e.cls}`);
}
