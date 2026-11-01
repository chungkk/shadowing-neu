import { apiUser, body, fail, str } from "@/lib/api";
import { allow } from "@/lib/rate-limit";
import {
  LEVELS,
  MAX_MEMBERS,
  cancelMatch,
  clientOf,
  createRoom,
  join,
  kick,
  leave,
  match,
  relay,
  setMuted,
  type Level,
} from "@/lib/sprechen";

const MINUTE = 60_000;

const level = (v: unknown): Level => ((LEVELS as readonly unknown[]).includes(v) ? (v as Level) : "A1");
const topics = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.map(str).map((t) => t.trim().slice(0, 30)).filter(Boolean))].slice(0, 10) : [];

/**
 * POST { clientId, action, … } — điều khiển phòng luyện nói (clientId lấy từ sự kiện "hello" của /sprechen/events).
 * action: create { name, level, topics, max, private } · join { roomId } · leave · match { level, topics } · cancel
 *         · mute { muted } · kick { target } · signal { to, data }
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{
    clientId: string;
    action: string;
    name: string;
    level: string;
    topics: string[];
    max: number;
    private: boolean;
    roomId: string;
    muted: boolean;
    target: string;
    to: string;
    data: unknown;
  }>(req);
  const c = clientOf(str(b.clientId), user.id);
  if (!c) return fail("Mất kết nối phòng luyện nói, tải lại trang nhé.", 409);

  switch (b.action) {
    case "signal": {
      // offer / answer / ICE: nhỏ, nhiều — chỉ chặn lạm dụng thô
      if (!allow(`sprechen:sig:${user.id}`, 600, MINUTE)) return fail("Quá nhiều yêu cầu", 429);
      if (JSON.stringify(b.data ?? null).length > 20_000) return fail("Dữ liệu quá lớn");
      return relay(c, str(b.to), b.data) ? Response.json({ ok: true }) : fail("Người này đã rời phòng", 404);
    }
    case "create": {
      if (!allow(`sprechen:create:${user.id}`, 10, 10 * MINUTE)) return fail("Bạn tạo phòng hơi nhiều, thử lại sau ít phút.", 429);
      const name = str(b.name).replace(/\s+/g, " ").trim().slice(0, 60);
      if (!name) return fail("Nhập tên phòng");
      const max = Math.min(MAX_MEMBERS, Math.max(2, Math.round(Number(b.max)) || 2));
      const room = createRoom(c, { name, level: level(b.level), topics: topics(b.topics), max, private: !!b.private });
      return Response.json({ room });
    }
    case "join": {
      const room = join(c, str(b.roomId));
      return typeof room === "string" ? fail(room, 409) : Response.json({ room });
    }
    case "leave":
      leave(c.id);
      return Response.json({ ok: true });
    case "match":
      if (!allow(`sprechen:match:${user.id}`, 30, MINUTE)) return fail("Thử lại sau ít giây", 429);
      match(c, level(b.level), topics(b.topics));
      return Response.json({ ok: true });
    case "cancel":
      cancelMatch(c.id);
      return Response.json({ ok: true });
    case "mute":
      setMuted(c, !!b.muted);
      return Response.json({ ok: true });
    case "kick": {
      const err = kick(c, str(b.target));
      return err ? fail(err, 403) : Response.json({ ok: true });
    }
    default:
      return fail("Hành động không hợp lệ");
  }
}
