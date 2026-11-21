import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookMarked, Languages, Layers, Link2 } from "lucide-react";
import { connection } from "next/server";
import { getCurrentUser, type User } from "@/lib/auth";
import { accessOf, lessonsFor, lockInfo } from "@/lib/access";
import { dueCount, LEVELS, listChannels, listProgress } from "@/lib/db";
import { fillLessonChannels } from "@/lib/channels";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import PageHeader from "@/components/PageHeader";
import ContinueLearning from "@/components/ContinueLearning";
import { percent } from "@/lib/progress";
import { RecentVideos } from "@/components/RecentVideos";
import { pageMeta } from "@/lib/page-meta";
import { LessonGridSkeleton } from "@/components/Skeleton";
import { lessonPath } from "@/lib/slug";
import { levelCatalogPath } from "@/lib/lesson-seo";
import OwnLessons from "@/components/OwnLessons";

export const metadata: Metadata = pageMeta({
  title: "Học tiếng Đức qua video YouTube – Luyện nghe nói A1–C2",
  description:
    "Luyện nghe nói tiếng Đức theo phương pháp shadowing với video YouTube thật: phụ đề từng câu, dịch tiếng Việt, ghi âm, chép chính tả. Bài theo trình độ A1–C2.",
  path: "/tieng-duc",
});

const NEW_MS = 3 * 86_400_000;

function lessonItems(user: User | null) {
  const now = Date.now();
  const access = accessOf(user?.role === "admin" ? null : user);
  const progress = new Map(user ? listProgress(user.id).map((p) => [p.source, p]) : []);
  const avatars = new Map(listChannels().flatMap((c) => (c.handle && c.avatar ? [[c.handle.toLowerCase(), c.avatar] as const] : [])));
  const items = lessonsFor(user?.role === "admin" ? null : (user?.id ?? null)).map((l) => {
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
      isNew: now - +new Date(l.createdAt.replace(" ", "T") + "Z") < NEW_MS,
      access: access(l.id),
      channel: l.channel,
      channelUrl: l.channelUrl || null,
      channelAvatar: avatars.get(l.channelUrl?.match(/\/(@[^/?#]+)/)?.[1]?.toLowerCase() ?? "") ?? null,
    };
  });
  return items.sort((x, y) => +(x.access === "locked") - +(y.access === "locked"));
}

async function Lessons() {
  await connection();
  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  fillLessonChannels();
  return <LessonGrid lessons={lessonItems(user)} lock={lockInfo(admin ? null : user)} admin={admin} />;
}

const levelRank = (lv: string) => {
  const i = (LEVELS as readonly string[]).indexOf(lv);
  return i < 0 ? LEVELS.length : i;
};

/** Ô dán link YouTube: gọn, đặt dưới thư viện bài học */
function OwnVideo() {
  return (
    <section aria-labelledby="own-video" className="card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-accent-text" aria-hidden />
        <h2 id="own-video" className="text-sm font-semibold text-foreground">
          Luyện với video YouTube bất kỳ có phụ đề tiếng Đức
        </h2>
      </div>
      <YouTubeUrlForm secondary />
      <p className="text-xs text-muted">Học thử miễn phí (không lưu tiến độ) — hoặc đổi kim cương để lưu thành bài học riêng.</p>
    </section>
  );
}

function GuestHero({ first, levels }: { first?: { slug: string; title: string; level: string }; levels: string[] }) {
  return (
    <PageHeader
      sec="de"
      icon={Languages}
      mascot
      title="Học tiếng Đức qua video thật"
      sub="Nghe từng câu, nói theo (shadowing), ghi âm so sánh và chép chính tả cùng bản dịch tiếng Việt."
      meta={<span className="badge badge-accent max-sm:hidden">A1 – C2</span>}
      actions={
        first && (
          <Link href={lessonPath(first.slug)} className="btn btn-primary max-sm:w-full">
            Thử bài {first.level} đầu tiên <ArrowRight className="size-4" />
          </Link>
        )
      }
    >
      {levels.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-muted">Chọn trình độ:</span>
          {levels.map((lv) => (
            <Link key={lv} href={levelCatalogPath(lv)} className="chip hit-44 text-xs">
              {lv}
            </Link>
          ))}
        </div>
      )}
    </PageHeader>
  );
}

async function Top() {
  await connection();
  const user = await getCurrentUser();
  if (user) {
    const due = dueCount(user.id);
    return (
      <>
        <PageHeader
          sec="de"
          icon={Languages}
          mascot
          title={`Chào ${user.name}`}
          sub="Tiếp tục bài học đang dở, ôn từ đến hạn hoặc chọn một video mới theo trình độ của bạn."
          actions={
            due > 0 ? (
              <Link href="/vocab/notebook?review=1" className="btn btn-primary btn-sm">
                <Layers className="size-4" /> Ôn {due} từ đến hạn
              </Link>
            ) : (
              <Link href="/vocab" className="btn btn-sm">
                <BookMarked className="size-4 text-muted" /> Kho từ vựng
              </Link>
            )
          }
        />
        <ContinueLearning userId={user.id} />
        <OwnLessons userId={user.id} />
      </>
    );
  }
  const items = lessonItems(null).filter((l) => l.access !== "locked");
  const first = [...items].sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.id - b.id)[0];
  const levels = [...new Set(items.map((l) => l.level))].sort((a, b) => levelRank(a) - levelRank(b));
  return (
    <>
      <GuestHero first={first} levels={levels} />
      <RecentVideos />
    </>
  );
}

export default function Home() {
  return (
    <main className="page gap-7 md:gap-8">
      <Suspense fallback={<div className="skeleton h-32 rounded-[var(--radius-lg)]" />}>
        <Top />
      </Suspense>

      <Suspense fallback={<LessonGridSkeleton />}>
        <Lessons />
      </Suspense>

      <OwnVideo />
    </main>
  );
}
