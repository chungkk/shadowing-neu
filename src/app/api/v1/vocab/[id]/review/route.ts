import type { NextRequest } from "next/server";
import { reviewVocab } from "@/lib/db";
import { apiUser, body, fail, str } from "@/lib/api";
import { GRADES, type Grade } from "@/lib/srs";

const level = (v: unknown, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null);

/**
 * Chấm 1 lần ôn (lặp lại ngắt quãng) → { stage, dueAt, mastery }. Mỗi lần ôn được ghi thành 1 sự kiện (review_events).
 * Body: { grade: "again" | "hard" | "good" | "easy" } (hoặc { correct: boolean } như app cũ → good / again)
 * + tuỳ chọn { mode: "duolingo" | "crazy", exercise (dạng bài; crazy: recall · recall-self · cued · shadow), recall: 0–3, speaking: 0–2, autoClear: 0–1 }.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/vocab/[id]/review">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ correct: boolean; grade: string; mode: string; exercise: string; recall: number; speaking: number; autoClear: number }>(req);
  const grade: Grade = GRADES.includes(b.grade as Grade) ? (b.grade as Grade) : b.correct === true ? "good" : "again";
  const autoClear = typeof b.autoClear === "number" && b.autoClear >= 0 && b.autoClear <= 1 ? b.autoClear : null;
  const res = reviewVocab(user.id, Number((await ctx.params).id), {
    grade,
    mode: b.mode === "crazy" ? "crazy" : "duolingo",
    exercise: str(b.exercise).slice(0, 32),
    recall: level(b.recall, 3),
    speaking: level(b.speaking, 2),
    autoClear,
  });
  if (!res) return fail("Không tìm thấy từ", 404);
  return Response.json(res);
}
