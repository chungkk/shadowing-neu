import { apiUser, body, fail, str } from "@/lib/api";
import { isRight } from "@/lib/fuehrerschein-rules";
import { QUIZ_MODULES, quizStats, recordQuizAnswers, resetQuiz, type QuizModule } from "@/lib/db";
import * as fuehrerschein from "@/lib/fuehrerschein";
import * as lid from "@/lib/lid";

// Tiến độ trả lời của tab Lái xe (module "fuehrerschein") và Leben in Deutschland ("lid")

const moduleOf = (v: unknown) => ((QUIZ_MODULES as readonly unknown[]).includes(v) ? (v as QuizModule) : null);
const exists = (m: QuizModule, id: string) => (m === "fuehrerschein" ? fuehrerschein.hasQuestion(id) : lid.hasQuestion(id));

/** GET ?module=lid → { stats: { [qid]: { correct, wrong, lastOk } } } */
export async function GET(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const m = moduleOf(new URL(req.url).searchParams.get("module"));
  if (!m) return fail("module không hợp lệ");
  return Response.json({ stats: quizStats(user.id, m) });
}

const gradableOf = (m: QuizModule, id: string) => (m === "fuehrerschein" ? fuehrerschein.gradable([id]) : lid.gradable([id]))[0];

/**
 * POST { module, answers: [{ qid, picked? , ok? }] } → ghi kết quả (tối đa 100 câu / lần)
 * - Có `picked` (web): server tự chấm, không tin cờ ok của trình duyệt. Chỉ có `ok` (app di động bản cũ): dùng ok.
 * - Câu không còn trong bộ đề (app chưa cập nhật dữ liệu) bị bỏ qua thay vì từ chối cả lô → { ok, skipped }
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ module: string; answers: { qid: unknown; ok: unknown; picked?: unknown }[] }>(req);
  const m = moduleOf(b.module);
  if (!m) return fail("module không hợp lệ");
  if (!Array.isArray(b.answers) || !b.answers.length || b.answers.length > 100) return fail("Thiếu câu trả lời");
  const all = b.answers.map((a) => {
    const qid = str(a?.qid);
    const picked = Array.isArray(a?.picked) ? a.picked.filter((x): x is string => typeof x === "string").slice(0, 10) : null;
    const q = picked && exists(m, qid) ? gradableOf(m, qid) : null;
    return { qid, ok: q ? isRight(q, picked!) : a?.ok === true };
  });
  const answers = all.filter((a) => exists(m, a.qid));
  if (!answers.length) return fail("Không tìm thấy câu hỏi", 404);
  recordQuizAnswers(user.id, m, answers);
  return Response.json({ ok: true, skipped: all.length - answers.length });
}

/** DELETE { module, all? } → xoá tiến độ của phần đó (all: cả câu đánh dấu + lịch sử thi) */
export async function DELETE(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ module: string; all: boolean }>(req);
  const m = moduleOf(b.module);
  if (!m) return fail("module không hợp lệ");
  resetQuiz(user.id, m, b.all === true);
  return Response.json({ ok: true });
}
