import { apiUser, fail } from "@/lib/api";
import { readAvatar } from "@/lib/avatar";

/**
 * GET → ảnh đại diện của người dùng `id`. Cần đăng nhập; chỉ chính chủ hoặc admin xem được.
 * URL có ?v=<mốc đổi ảnh> → cache lâu được (đổi ảnh thì URL đổi).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || (id !== user.id && user.role !== "admin")) return fail("Không có quyền xem ảnh này", 403);
  const img = readAvatar(id);
  if (!img) return fail("Chưa có ảnh", 404);
  return new Response(new Uint8Array(img.bytes), {
    headers: { "Content-Type": img.type, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
