import "server-only";
import { accessOf, lessonsFor } from "./access";
import type { User } from "./auth";
import { listChannels, listProgress, type LessonSummary } from "./db";
import { percent } from "./progress";

const NEW_MS = 3 * 86_400_000;

/** Thẻ bài cho LessonGrid (tiến độ, khóa/mở, ảnh kênh) — lọc thêm bằng `filter` (theo trình độ, theo kênh…) */
export function lessonGridItems(user: User | null, filter?: (l: LessonSummary) => boolean) {
  const now = Date.now();
  const admin = user?.role === "admin";
  const access = accessOf(admin ? null : user);
  const progress = new Map(user ? listProgress(user.id).map((p) => [p.source, p]) : []);
  const avatars = new Map(listChannels().flatMap((c) => (c.handle && c.avatar ? [[c.handle.toLowerCase(), c.avatar] as const] : [])));
  const lessons = lessonsFor(admin ? null : (user?.id ?? null));
  return (filter ? lessons.filter(filter) : lessons)
    .map((l) => {
      const p = progress.get(`/lesson/${l.id}`);
      return {
        id: l.id,
        title: l.title,
        slug: l.slug,
        videoId: l.videoId,
        level: l.level,
        description: l.description,
        sentences: l.sentenceCount ?? l.segmentCount,
        duration: l.duration ?? 0,
        dictation: l.dictation,
        percent: p ? percent(p) : 0,
        completed: p?.completed ?? 0,
        isNew: now - +new Date(l.createdAt.replace(" ", "T") + "Z") < NEW_MS,
        access: access(l.id),
        channel: l.channel,
        channelUrl: l.channelUrl || null,
        channelAvatar: avatars.get(l.channelUrl?.match(/\/(@[^/?#]+)/)?.[1]?.toLowerCase() ?? "") ?? null,
      };
    })
    .sort((x, y) => +(x.access === "locked") - +(y.access === "locked"));
}

export type LessonGridItem = ReturnType<typeof lessonGridItems>[number];
