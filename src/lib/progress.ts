import "server-only";
import { lessonsFor } from "./access";
import { listOwnLessons, listProgress, type Progress } from "./db";
import { lessonPath } from "./slug";

/**
 * % đã học: số câu đã nghe hoặc đã làm chính tả, lấy cái nhiều hơn (giống app).
 * Làm tròn xuống (199/200 câu chưa là "xong"); đã học ít nhất 1 câu thì tối thiểu 1%
 */
export const percent = (p: Progress) => {
  if (!p.total) return 0;
  const done = Math.min(p.total, Math.max(p.seen.length, Object.keys(p.dictDone).length));
  return done ? Math.max(1, Math.floor((done * 100) / p.total)) : 0;
};

/** Bài / video đang học dở, mới nhất trước — dùng chung cho "Tiếp tục học", dải "Hôm nay" và chuông nhắc nhở */
export function unfinished(userId: number, limit = 4) {
  const lessons = new Map([...lessonsFor(userId), ...listOwnLessons(userId)].map((l) => [String(l.id), l]));
  return listProgress(userId)
    // Video tự dán không còn lưu tiến độ (chỉ bài riêng mới lưu) → bỏ tiến độ /watch cũ, mở lại cũng không học tiếp được
    .filter((p) => percent(p) < 100 && !p.source.startsWith("/watch/"))
    .map((p) => {
      const [, kind, id] = p.source.split("/");
      const lesson = kind === "lesson" ? lessons.get(id) : undefined;
      // Bài đã bị xoá / chuyển về nháp → bỏ qua
      return { p, href: lesson ? lessonPath(lesson.slug) : p.source, title: lesson?.title ?? p.title, videoId: kind === "watch" ? id : lesson?.videoId };
    })
    .filter((x): x is typeof x & { videoId: string } => !!x.videoId)
    .slice(0, limit);
}
