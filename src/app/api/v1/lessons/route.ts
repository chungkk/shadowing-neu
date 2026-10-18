import { getCurrentUser } from "@/lib/auth";
import { listLessons } from "@/lib/db";

/** GET → danh sách bài đã đăng (admin thấy cả bản nháp), không kèm phụ đề */
export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ lessons: listLessons({ includeDrafts: user?.role === "admin" }) });
}
