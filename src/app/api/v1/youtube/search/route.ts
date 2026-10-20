import type { NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { searchYouTube } from "@/lib/youtube-search";

/**
 * GET /api/v1/youtube/search?q=<từ khoá> → { videos: VideoHit[] }
 * App tìm thẳng trên điện thoại; route này là dự phòng khi điện thoại gọi YouTube lỗi. Khách cũng dùng được.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return fail("Thiếu từ khoá tìm kiếm");
  if (q.length > 150) return fail("Từ khoá quá dài");
  try {
    return Response.json({ videos: await searchYouTube(q) });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
