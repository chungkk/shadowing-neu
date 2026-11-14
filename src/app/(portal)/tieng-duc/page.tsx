import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { connection } from "next/server";
import { getCurrentUser, type User } from "@/lib/auth";
import { accessOf, lessonsFor, lockInfo } from "@/lib/access";
import { LEVELS, listProgress } from "@/lib/db";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import Mascot from "@/components/Mascot";
import ContinueLearning, { percent } from "@/components/ContinueLearning";
import { RecentVideos } from "@/components/RecentVideos";
import { LessonGridSkeleton } from "@/components/Skeleton";
import TodayStrip from "@/components/TodayStrip";
import { lessonPath } from "@/lib/slug";

// Link đã lọc (/tieng-duc?level=B1) vẫn là trang học tiếng Đức với Google
export const metadata: Metadata = { alternates: { canonical: "/tieng-duc" } };

const NEW_MS = 3 * 86_400_000; // bài đăng trong 3 ngày → nhãn "Mới" (lâu hơn thì gần như bài nào cũng "Mới")

/** Dữ liệu thẻ bài: chỉ gửi xuống trình duyệt những gì thẻ cần */
function lessonItems(user: User | null) {
  const now = Date.now();
  // Admin học được mọi bài, nhưng thẻ bài hiện nhãn như khách thấy (🔒 / Miễn phí) để admin kiểm tra
  const access = accessOf(user?.role === "admin" ? null : user);
  const progress = new Map(user ? listProgress(user.id).map((p) => [p.source, p]) : []);
  const items = lessonsFor(user?.role === "admin" ? null : (user?.id ?? null)).map((l) => {
    const p = progress.get(`/lesson/${l.id}`); // khoá tiến độ của bài vẫn theo id
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
    };
  });
  // Bài học được ngay (miễn phí / đã mở) lên đầu, trong mỗi nhóm vẫn mới nhất trước
  return items.sort((x, y) => +(x.access === "locked") - +(y.access === "locked"));
}

async function Lessons() {
  await connection(); // đọc DB lúc request, không prerender
  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  return <LessonGrid lessons={lessonItems(user)} lock={lockInfo(admin ? null : user)} admin={admin} />;
}

const levelRank = (lv: string) => {
  const i = (LEVELS as readonly string[]).indexOf(lv);
  return i < 0 ? LEVELS.length : i;
};

/** Ô dán link YouTube — lựa chọn phụ: người mới nên bắt đầu từ bài có sẵn */
function OwnVideo() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold text-muted">Hoặc luyện với video YouTube bất kỳ có phụ đề tiếng Đức:</p>
      <YouTubeUrlForm secondary />
    </div>
  );
}

/** Khách: hero giới thiệu, nút chính = bài dễ nhất học được ngay, chip trình độ lọc thư viện */
function GuestHero({ first, levels }: { first?: { slug: string; title: string; level: string }; levels: string[] }) {
  return (
    <section className="sticker grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-4 p-4 sm:gap-x-6 sm:p-6">
      <Mascot className="bob size-20 sm:row-span-3 sm:size-36" />
      <div className="flex flex-col items-start gap-1.5">
        <span className="-rotate-2 rounded-2xl rounded-bl-sm border-2 border-ink bg-gold px-3 py-0.5 text-sm font-extrabold text-black">Hallo! Cùng nói nào!</span>
        <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Luyện nói tiếng Đức với video thật</h1>
      </div>
      <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
        <p className="text-muted">Nghe từng câu, nói theo và ghi âm để so với người bản xứ.</p>
        {first && (
          <Link href={lessonPath(first.slug)} className="btn btn-primary self-start px-5 py-3 text-base max-sm:w-full">
            Thử bài {first.level} đầu tiên <ChevronRight className="size-5" />
          </Link>
        )}
        {levels.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-muted">Trình độ của bạn:</span>
            {levels.map((lv) => (
              <Link key={lv} href={`/tieng-duc?level=${lv}#lessons`} className="btn px-3 py-1.5 pointer-coarse:py-2.5">
                {lv}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="col-span-2 sm:col-span-1">
        <OwnVideo />
      </div>
    </section>
  );
}

/** Đầu trang: đã đăng nhập → "Hôm nay" (Học tiếp · Từ đến hạn · Chuỗi ngày) lên trước, hero thu nhỏ; khách → hero giới thiệu */
async function Top() {
  await connection();
  const user = await getCurrentUser();
  if (user) {
    return (
      <>
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Mascot className="size-12 shrink-0" />
            <h1 className="text-xl leading-tight font-extrabold sm:text-2xl">Hallo, {user.name}! Hôm nay học gì?</h1>
          </div>
          <TodayStrip userId={user.id} />
        </section>
        <ContinueLearning userId={user.id} />
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

/** Đã đăng nhập: ô dán link nằm dưới thư viện (lựa chọn phụ) */
async function OwnVideoForUser() {
  const user = await getCurrentUser();
  return user ? (
    <section className="sticker p-4 sm:p-6">
      <OwnVideo />
    </section>
  ) : null;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 md:gap-10 md:p-6">
      <Suspense fallback={<div className="sticker h-48 animate-pulse motion-reduce:animate-none" />}>
        <Top />
      </Suspense>

      <Suspense fallback={<LessonGridSkeleton />}>
        <Lessons />
      </Suspense>

      <Suspense>
        <OwnVideoForUser />
      </Suspense>
    </main>
  );
}
