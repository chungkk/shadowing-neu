import { connection } from "next/server";
import { fail } from "@/lib/api";
import { readCover } from "@/lib/news";

/** GET → ảnh bìa bài tin tức (công khai). Tên file là duy nhất, đổi ảnh = tên mới → cache lâu được */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  await connection();
  const img = readCover((await params).name);
  if (!img) return fail("Không có ảnh", 404);
  return new Response(new Uint8Array(img.bytes), {
    headers: { "Content-Type": img.type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
