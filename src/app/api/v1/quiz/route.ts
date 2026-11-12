import { apiUser, body, fail, str } from "@/lib/api";
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

/** POST { module, answers: [{ qid, ok }] } → ghi kết quả (tối đa 100 câu / lần) */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ module: string; answers: { qid: unknown; ok: unknown }[] }>(req);
  const m = moduleOf(b.module);
  if (!m) return fail("module không hợp lệ");
  if (!Array.isArray(b.answers) || !b.answers.length || b.answers.length > 100) return fail("Thiếu câu trả lời");
  const answers = b.answers.map((a) => ({ qid: str(a?.qid), ok: a?.ok === true }));
  if (answers.some((a) => !exists(m, a.qid))) return fail("Không tìm thấy câu hỏi", 404);
  recordQuizAnswers(user.id, m, answers);
  return Response.json({ ok: true });
}

/** DELETE { module } → xoá tiến độ của phần đó */
export async function DELETE(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const m = moduleOf((await body<{ module: string }>(req)).module);
  if (!m) return fail("module không hợp lệ");
  resetQuiz(user.id, m);
  return Response.json({ ok: true });
}
