import { apiUser, body, fail, str } from "@/lib/api";
import { getQuizPref, setQuizPref } from "@/lib/db";
import { isClassId } from "@/lib/laixe";
import { getState } from "@/lib/lid";

/** GET → { cls, state } — hạng bằng lái & bang LiD đã lưu trên tài khoản */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({
    cls: getQuizPref(user.id, "fuehrerschein", "class"),
    state: getQuizPref(user.id, "lid", "state"),
  });
}

/** PUT { cls?, state? } → cập nhật hạng bằng lái / bang LiD cho tài khoản */
export async function PUT(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ cls?: unknown; state?: unknown }>(req);
  if (b.cls !== undefined) {
    const cls = str(b.cls).trim();
    if (!isClassId(cls)) return fail("Hạng bằng không hợp lệ");
    setQuizPref(user.id, "fuehrerschein", "class", cls);
  }
  if (b.state !== undefined) {
    const state = str(b.state).trim();
    if (!getState(state)) return fail("Bang không hợp lệ");
    setQuizPref(user.id, "lid", "state", state);
  }
  return Response.json({
    cls: getQuizPref(user.id, "fuehrerschein", "class"),
    state: getQuizPref(user.id, "lid", "state"),
  });
}
