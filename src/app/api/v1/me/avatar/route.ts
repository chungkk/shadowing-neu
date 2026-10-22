import { getUserById } from "@/lib/db";
import { apiUser, fail, publicUser } from "@/lib/api";
import { AVATAR_MAX_BYTES, imageType, removeAvatar, saveAvatar } from "@/lib/avatar";

/** POST multipart (trường "file": JPEG / PNG / WebP ≤ 1 MB) → đổi ảnh đại diện → { user } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || !file.size) return fail("Thiếu ảnh");
  if (file.size > AVATAR_MAX_BYTES) return fail("Ảnh quá lớn (tối đa 1 MB)", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageType(bytes)) return fail("Chỉ nhận ảnh JPEG, PNG hoặc WebP");
  saveAvatar(user.id, bytes);
  return Response.json({ user: publicUser(getUserById(user.id)!) });
}

/** DELETE → xoá ảnh đại diện (quay về chữ cái đầu tên) → { user } */
export async function DELETE() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  removeAvatar(user.id);
  return Response.json({ user: publicUser(getUserById(user.id)!) });
}
