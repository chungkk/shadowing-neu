import { apiUser, body, fail, str } from "@/lib/api";
import { quizBookmarks, setQuizBookmark, type QuizModule } from "@/lib/db";
import * as fuehrerschein from "@/lib/fuehrerschein";
import * as lid from "@/lib/lid";

// Câu đánh dấu ⭐ của tab Lái xe (module "fuehrerschein", mặc định) và Leben in Deutschland ("lid")

const moduleOf = (v: unknown): QuizModule => (v === "lid" ? "lid" : "fuehrerschein");

/** GET ?module=lid → { ids: string[] } (mới nhất trước) */
export async function GET(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ ids: quizBookmarks(user.id, moduleOf(new URL(req.url).searchParams.get("module"))) });
}

/** POST { module?, qid, on } → đánh dấu / bỏ đánh dấu */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ module: string; qid: string; on: boolean }>(req);
  const m = moduleOf(b.module);
  const qid = str(b.qid);
  if (!(m === "lid" ? lid.hasQuestion(qid) : fuehrerschein.hasQuestion(qid))) return fail("Không tìm thấy câu hỏi", 404);
  setQuizBookmark(user.id, m, qid, b.on === true);
  return Response.json({ ok: true });
}
