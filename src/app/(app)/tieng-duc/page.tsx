import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookMarked,
  GraduationCap,
  Headphones,
  Keyboard,
  Languages,
  Layers,
  Link2,
  Mic,
  Play,
  Volume2,
} from "lucide-react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { lockInfo } from "@/lib/access";
import { dueCount, LEVELS } from "@/lib/db";
import { lessonGridItems } from "@/lib/lesson-items";
import { fillLessonChannels } from "@/lib/channels";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import ContinueLearning from "@/components/ContinueLearning";
import { RecentVideos } from "@/components/RecentVideos";
import { pageMeta } from "@/lib/page-meta";
import { LessonGridSkeleton } from "@/components/Skeleton";
import { lessonPath } from "@/lib/slug";
import OwnLessons from "@/components/OwnLessons";

export const metadata: Metadata = pageMeta({
  title: "Học tiếng Đức qua video YouTube – Luyện nghe nói A1–C2",
  description:
    "Luyện nghe nói tiếng Đức theo phương pháp shadowing với video YouTube thật: phụ đề từng câu, dịch tiếng Việt, ghi âm, chép chính tả. Bài theo trình độ A1–C2.",
  path: "/tieng-duc",
});

const levelRank = (lv: string) => {
  const i = (LEVELS as readonly string[]).indexOf(lv);
  return i < 0 ? LEVELS.length : i;
};

/** Xem trước giao diện học thực tế (video + phụ đề nổi bật + chép chính tả + nút Shadowing) */
function LearningInterfacePreview() {
  return (
    <div
      className="card min-w-0 flex flex-col gap-3.5 border-line bg-card p-4 sm:p-5"
      aria-label="Xem trước giao diện học tiếng Đức trên HalloVN"
    >
      {/* Thanh tiêu đề nhỏ */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="badge shrink-0 border border-link/25 bg-link-soft font-bold text-link">B1</span>
          <span className="truncate text-xs font-semibold text-foreground">Alltag · Im Café</span>
        </div>
        <span className="shrink-0 font-mono text-[11px] whitespace-nowrap text-muted tabular-nums">6/24 · 0,85×</span>
      </div>

      {/* Khung mô phỏng trình phát video + câu đang học */}
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-background p-3.5">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5 font-semibold text-accent-text">
            <span className="size-2 rounded-full bg-accent" aria-hidden /> Đang phát · Shadowing
          </span>
          <span className="font-mono tabular-nums">01:14 / 04:20</span>
        </div>
        <div className="progress h-1.5">
          <div className="progress-bar" style={{ width: "36%" }} />
        </div>
        <div className="rounded-lg border border-accent/35 bg-accent-soft/55 px-3 py-2.5">
          <p lang="de" className="text-sm leading-snug font-bold text-foreground sm:text-[0.9375rem]">
            Ich hätte gern einen Kaffee zum Mitnehmen, bitte.
          </p>
          <p className="mt-1 text-xs text-muted">Cho tôi một ly cà phê mang đi nhé.</p>
        </div>
      </div>

      {/* Minh họa chép chính tả trực tiếp */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            <Keyboard className="size-3.5 text-link" aria-hidden /> Chép chính tả từng từ
          </span>
          <span className="font-mono text-accent-text tabular-nums">+4 từ đúng</span>
        </div>
        <div lang="de" className="flex flex-wrap gap-1.5 font-mono text-xs">
          <span className="rounded-md border border-ok/35 bg-ok-soft px-2 py-1 font-semibold text-ok-text">Ich</span>
          <span className="rounded-md border border-ok/35 bg-ok-soft px-2 py-1 font-semibold text-ok-text">hätte</span>
          <span className="rounded-md border border-ok/35 bg-ok-soft px-2 py-1 font-semibold text-ok-text">gern</span>
          <span className="rounded-md border border-link bg-sidebar px-2 py-1 font-semibold text-foreground">Kaff_</span>
          <span className="rounded-md border border-dashed border-line-strong bg-sidebar px-2 py-1 text-muted">bitte</span>
        </div>
      </div>

      {/* Thanh điều khiển nghe & ghi âm Shadowing */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 pt-0.5">
        <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-sidebar text-xs font-semibold text-foreground">
          <Play className="size-3.5 text-accent-text" aria-hidden /> Nghe lại
        </span>
        <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-accent/35 bg-accent-soft text-xs font-semibold text-accent-text">
          <Mic className="size-3.5" aria-hidden /> Ghi âm nói theo
        </span>
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-sidebar text-muted">
          <Volume2 className="size-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}

/** Ô dán link YouTube: gọn, đặt dưới thư viện bài học */
function OwnVideo() {
  return (
    <section aria-labelledby="own-video" className="card flex flex-col gap-3.5 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="icon-bubble tint-link size-8">
            <Link2 className="size-4" aria-hidden />
          </span>
          <h2 id="own-video" className="text-base font-bold text-foreground">
            Luyện với video YouTube bất kỳ có phụ đề tiếng Đức
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          Dán đường link YouTube yêu thích của bạn để tách câu tự động, luyện Shadowing và chép chính tả ngay lập tức.
        </p>
      </div>
      <YouTubeUrlForm secondary />
      <p className="text-xs text-muted">Học thử miễn phí (không lưu tiến độ) — hoặc đổi kim cương để lưu thành bài học riêng.</p>
    </section>
  );
}

async function DeutschContent() {
  await connection();
  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  fillLessonChannels();
  const allLessons = lessonGridItems(user);
  const unlocked = allLessons.filter((l) => l.access !== "locked");
  const first = [...unlocked].sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.id - b.id)[0] ?? allLessons[0];
  const due = user ? dueCount(user.id) : 0;

  return (
    <>
      {/* ── Hero: Modern Dark EdTech — rõ ràng, thân thiện, xem trước màn học thực tế ── */}
      <section className="card grid items-center gap-8 overflow-hidden border-line bg-sidebar p-5 sm:p-7 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:p-8">
        <div className="flex min-w-0 flex-col items-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-foreground">
              <span className="size-2 rounded-full bg-accent" aria-hidden />
              {user ? `Chào ${user.name} · Tiếp tục luyện tập` : "Tiếng Đức qua video bản xứ · A1–C2"}
            </span>
            {due > 0 && (
              <Link href="/vocab/notebook?review=1" className="badge badge-gold gap-1 hover:underline">
                <Layers className="size-3" aria-hidden /> {due} từ đến hạn ôn
              </Link>
            )}
          </div>

          <h1 className="display max-w-[18ch]">
            Nghe hiểu tiếng Đức thật. Nói tự nhiên mỗi ngày.
          </h1>

          <p className="lead max-w-[50ch]">
            Học trực tiếp qua video YouTube bản xứ với phương pháp Shadowing, chép chính tả từng từ, dịch tiếng Việt và sổ ôn từ vựng SRS — thiết kế dịu mắt cho những buổi học tập trung dài.
          </p>

          <div className="flex w-full flex-col gap-2.5 pt-1 sm:w-auto sm:flex-row">
            {first && (
              <Link href={lessonPath(first.slug)} className="btn btn-primary btn-lg">
                Bắt đầu học <ArrowRight className="size-4" />
              </Link>
            )}
            <a href="#lessons" className="btn btn-lg">
              Khám phá bài học
            </a>
            {user && due > 0 && (
              <Link href="/vocab/notebook?review=1" className="btn btn-soft btn-lg">
                <Layers className="size-4" /> Ôn {due} từ
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Headphones className="size-3.5 text-accent-text" aria-hidden /> Shadowing từng câu
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Keyboard className="size-3.5 text-link" aria-hidden /> Chép chính tả chấm từng từ
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Languages className="size-3.5 text-amber" aria-hidden /> Tra từ &amp; bản dịch tiếng Việt
            </span>
            <Link href="/ngu-phap" className="inline-flex items-center gap-1 text-accent-text hover:underline">
              <GraduationCap className="size-3.5" aria-hidden /> Ngữ pháp A1–B2
            </Link>
            <Link href="/vocab" className="inline-flex items-center gap-1 text-link hover:underline">
              <BookMarked className="size-3.5" aria-hidden /> Kho từ Goethe A1–B2
            </Link>
          </div>
        </div>

        <LearningInterfacePreview />
      </section>

      {/* ── Continue Learning / Own Lessons / Recent Videos ── */}
      {user ? (
        <>
          <ContinueLearning userId={user.id} />
          <OwnLessons userId={user.id} />
        </>
      ) : (
        <RecentVideos />
      )}

      {/* ── Learning Levels (A1–C2) + Explore by Topic + Video Library ── */}
      <LessonGrid lessons={allLessons} lock={lockInfo(admin ? null : user)} admin={admin} showExplore />
    </>
  );
}

export default function DeutschPage() {
  return (
    <main className="page gap-9 md:gap-11" data-sec="de">
      <Suspense
        fallback={
          <div className="flex flex-col gap-8">
            <div className="skeleton h-80 rounded-[var(--radius-lg)]" />
            <LessonGridSkeleton />
          </div>
        }
      >
        <DeutschContent />
      </Suspense>

      <OwnVideo />
    </main>
  );
}
