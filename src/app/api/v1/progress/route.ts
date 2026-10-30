import type { NextRequest } from "next/server";
import { deleteProgress, getProgress, listProgress, saveProgress, type DictResult } from "@/lib/db";
import { apiUser, body, fail, str } from "@/lib/api";

/**
 * Tiến độ học của người đang đăng nhập — đồng bộ giữa web và app.
 * source: "/lesson/<id>" hoặc "/watch/<videoId>" (giống link lưu kèm từ vựng).
 */

const SOURCE_RE = /^\/(lesson|watch)\/[\w-]{1,64}$/;
const LEVELS = ["easy", "normal", "hard"];
const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);

/** GET ?source=… → { progress } (null nếu chưa học) · không có source → { progress: [...] } mọi bài, mới nhất trước */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const source = req.nextUrl.searchParams.get("source");
  if (source) return Response.json({ progress: SOURCE_RE.test(source) ? getProgress(user.id, source) : null });
  // Danh sách: bỏ chi tiết từng câu, chỉ trả số câu chính tả đã làm / số câu đã nghe
  return Response.json({
    progress: listProgress(user.id).map(({ dictDone, seen, ...p }) => ({ ...p, dictCount: Object.keys(dictDone).length, seenCount: seen.length })),
  });
}

/**
 * PUT { source, title, idx, total, mode, dictLevel, dictDone, seen?, dictPick? } → lưu.
 * dictDone được GỘP với bản đã lưu (học trên 2 máy cùng lúc không mất câu nào); kết quả mới ghi đè câu trùng.
 * seen (các câu đã nghe) cũng GỘP, kèm câu đang học khi ở Shadowing — client cũ / web không gửi seen thì vẫn tăng dần.
 * dictPick (lượt chính tả đang làm) GHI ĐÈ — lượt mới thay lượt cũ; không gửi thì giữ lượt đã lưu.
 */
export async function PUT(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ source: string; title: string; idx: number; total: number; mode: string; dictLevel: string; dictDone: unknown; seen: unknown; dictPick: unknown }>(req);
  const source = str(b.source);
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  const total = int(b.total);
  const idx = int(b.idx);
  if (total === null || total > 10000 || idx === null) return fail("Tiến độ không hợp lệ");

  const incoming: Record<string, DictResult> = {};
  if (b.dictDone && typeof b.dictDone === "object") {
    for (const [k, v] of Object.entries(b.dictDone as Record<string, DictResult>).slice(0, 10000)) {
      const i = Number(k);
      const correct = int(v?.correct);
      const all = int(v?.total);
      if (Number.isInteger(i) && i >= 0 && i < total && correct !== null && all !== null && correct <= all) incoming[i] = { correct, total: all };
    }
  }
  const at = Math.min(idx, Math.max(0, total - 1));
  const mode = b.mode === "dictation" ? "dictation" : "shadow";
  const prev = getProgress(user.id, source);
  const seen = new Set((prev?.seen ?? []).filter((i) => i < total));
  if (Array.isArray(b.seen)) for (const v of b.seen.slice(0, 10000)) if (int(v) !== null && v < total) seen.add(v);
  if (mode === "shadow") seen.add(at); // Chính tả tính riêng bằng dictDone
  const dictPick = Array.isArray(b.dictPick)
    ? [...new Set(b.dictPick.slice(0, 50).filter((v) => int(v) !== null && v < total) as number[])].sort((x, y) => x - y)
    : (prev?.dictPick ?? []).filter((i) => i < total);
  saveProgress(user.id, {
    source,
    title: str(b.title).slice(0, 200),
    idx: at,
    total,
    mode,
    dictLevel: LEVELS.includes(str(b.dictLevel)) ? str(b.dictLevel) : "normal",
    dictDone: { ...prev?.dictDone, ...incoming },
    seen: [...seen].sort((x, y) => x - y),
    dictPick,
  });
  return Response.json({ progress: getProgress(user.id, source) });
}

/** DELETE ?source=… → học lại từ đầu (xoá tiến độ bài này) · at = thời điểm xoá (cùng đồng hồ với updatedAt, để app so bản nào mới hơn) */
export async function DELETE(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const source = req.nextUrl.searchParams.get("source") ?? "";
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  deleteProgress(user.id, source);
  return Response.json({ ok: true, at: Date.now() });
}
