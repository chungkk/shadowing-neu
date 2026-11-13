import { apiUser, body, fail, str } from "@/lib/api";
import { listQuizExams, recordQuizExam } from "@/lib/db";
import { bogenIds, classInfo, classQuestionIds, gradable, isClassId } from "@/lib/fuehrerschein";
import { grade, isRight } from "@/lib/fuehrerschein-rules";
import * as lid from "@/lib/lid";

// Bài thi thử của tab Lái xe / Leben in Deutschland: server chấm lại từ dữ liệu của mình rồi lưu vào lịch sử

/** GET ?module=lid → { exams: ExamRecord[] } (100 bài gần nhất) */
export async function GET(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ exams: listQuizExams(user.id, new URL(req.url).searchParams.get("module") === "lid" ? "lid" : "fuehrerschein") });
}

const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max).map((x) => x.slice(0, 20)) : []);
const cleanAnswers = (list: Answer[]) =>
  list.map((a) => ({
    qid: str(a?.qid),
    picked: strings(a?.picked, 10),
    order: Array.isArray(a?.order) ? a.order.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 10).slice(0, 10) : [],
  }));

/** LiD: 30 câu chung + 3 câu của bang `cls` (mã bang), đúng ≥ 17 là đậu */
function lidExam(userId: number, b: { cls: unknown; durationS: unknown; answers: Answer[] }) {
  const state = lid.getState(str(b.cls));
  if (!state) return fail("Bang không hợp lệ");
  const answers = cleanAnswers(b.answers);
  const ids = answers.map((a) => a.qid);
  const own = new Set(lid.stateIds(state.code));
  const general = ids.filter(lid.isGeneral);
  if (new Set(ids).size !== ids.length || ids.length !== lid.EXAM_TOTAL || general.length !== lid.EXAM.general || ids.filter((id) => own.has(id)).length !== lid.EXAM.state)
    return fail("Đề thi không khớp");
  const qs = lid.gradable(ids);
  const picked = Object.fromEntries(answers.map((a) => [a.qid, a.picked]));
  const result = grade(qs, picked, lid.EXAM_MAX_WRONG);
  const durationS = Math.max(0, Math.min(6 * 3600, Math.round(Number(b.durationS) || 0)));
  const results = qs.filter((q) => picked[q.id]?.length).map((q) => ({ qid: q.id, ok: isRight(q, picked[q.id]) }));
  const id = recordQuizExam(userId, "lid", { kind: "random", ref: state.code, cls: state.code, ...result, maxErrorPoints: lid.EXAM_MAX_WRONG, durationS, answers }, results);
  return Response.json({ id, result });
}

type Answer = { qid: unknown; picked: unknown; order: unknown };

/** POST { kind: "random" | "bogen", ref, cls, durationS, answers: [{ qid, picked[], order[] }] } → { id, result } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ module: string; kind: string; ref: unknown; cls: unknown; durationS: unknown; answers: Answer[] }>(req);
  if (!Array.isArray(b.answers) || !b.answers.length || b.answers.length > 50) return fail("Thiếu câu trả lời");
  if (b.module === "lid") return lidExam(user.id, { cls: b.cls, durationS: b.durationS, answers: b.answers });
  const kind = b.kind === "bogen" ? "bogen" : b.kind === "random" ? "random" : null;
  if (!kind) return fail("Loại bài thi không hợp lệ");
  if (!isClassId(b.cls)) return fail("Hạng bằng không hợp lệ");
  const cls = b.cls;

  const answers = cleanAnswers(b.answers);
  const ids = answers.map((a) => a.qid);
  if (new Set(ids).size !== ids.length) return fail("Câu hỏi bị trùng");

  // Đề phải đúng là đề của hạng / đề mẫu đó
  let ref: string;
  let maxErrorPoints: number;
  if (kind === "bogen") {
    const n = Number(b.ref);
    const want = Number.isInteger(n) ? bogenIds(n) : null;
    if (!want || cls !== "B" || want.length !== ids.length || !want.every((id) => ids.includes(id))) return fail("Đề mẫu không khớp");
    ref = String(n);
    maxErrorPoints = classInfo("B").exam.maxErrorPoints;
  } else {
    const info = classInfo(cls);
    const pool = new Set(classQuestionIds(cls));
    if (ids.length !== Math.min(info.exam.questions, pool.size) || !ids.every((id) => pool.has(id))) return fail("Đề thi không khớp với hạng");
    ref = cls;
    maxErrorPoints = info.exam.maxErrorPoints;
  }

  const qs = gradable(ids);
  const picked = Object.fromEntries(answers.map((a) => [a.qid, a.picked]));
  const result = grade(qs, picked, maxErrorPoints);
  const durationS = Math.max(0, Math.min(6 * 3600, Math.round(Number(b.durationS) || 0)));
  // Chỉ ghi tiến độ câu đã làm: câu bỏ trống không tính là câu sai cần ôn
  const results = qs.filter((q) => picked[q.id]?.length).map((q) => ({ qid: q.id, ok: isRight(q, picked[q.id]) }));
  const id = recordQuizExam(user.id, "fuehrerschein", { kind, ref, cls, ...result, maxErrorPoints, durationS, answers }, results);
  return Response.json({ id, result });
}
