import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { after, connection } from "next/server";
import { ArrowRight, Car, ClipboardCheck, Gamepad2, Landmark, Layers, Play, RotateCcw } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { getCurrentUser, type User } from "@/lib/auth";
import { accessOf, lessonsFor } from "@/lib/access";
import { LEVELS, dueCount, listNewsItems, listNewsPosts, quizStats } from "@/lib/db";
import { allIds as drivingIds } from "@/lib/fuehrerschein";
import { refreshNews } from "@/lib/news";
import { summarize } from "@/lib/quiz-types";
import { lessonPath } from "@/lib/slug";
import { percent, unfinished } from "@/components/ContinueLearning";
import GuideCard from "@/components/GuideCard";
import { LoginLink } from "@/components/LoginDialog";
import Mascot from "@/components/Mascot";
import NewsCard from "@/components/NewsCard";
import { ProgressBar } from "@/components/QuizParts";
import { ListSkeleton } from "@/components/Skeleton";
import TodayStreak from "@/components/TodayStreak";

export const metadata: Metadata = {
  title: { absolute: "CKK – Học tiếng Đức, ôn thi bằng lái và quốc tịch bằng tiếng Việt" },
  description:
    "Học tiếng Đức với video thật, ôn lý thuyết lái xe hạng B và Leben in Deutschland có bản dịch tiếng Việt, hướng dẫn thủ tục cho người Việt ở Đức và tin nước Đức mỗi ngày.",
  alternates: { canonical: "/" },
};

const TILE = "group sticker sticker-link flex min-w-0 flex-col gap-2 p-4";
const LID_TOTAL = 460; // 300 câu chung + 16 bang × 10

const levelRank = (lv: string) => {
  const i = (LEVELS as readonly string[]).indexOf(lv);
  return i < 0 ? LEVELS.length : i;
};

/** Bài video dễ nhất khách học được ngay (không bị khoá) */
function easiestLesson() {
  const access = accessOf(null);
  return lessonsFor(null)
    .filter((l) => access(l.id) !== "locked")
    .sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.id - b.id)[0];
}

function Tile({ href, icon: Icon, label, title, children, tone = "text-accent-text" }: { href: string; icon: ComponentType<{ className?: string }>; label: string; title: string; children?: ReactNode; tone?: string }) {
  return (
    <Link href={href} className={TILE}>
      <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
        <Icon className={`size-4 ${tone}`} /> {label}
      </span>
      <span className="text-lg leading-snug font-extrabold group-hover:underline">{title}</span>
      {children}
    </Link>
  );
}

/** Khách: nói rõ CKK là gì + 3 thứ thử được ngay không cần tài khoản */
function GuestTop() {
  const first = easiestLesson();
  return (
    <>
      <section className="sticker grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 p-4 sm:p-6">
        <Mascot className="bob size-20 sm:row-span-2 sm:size-32" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Học tiếng Đức, ôn thi bằng lái và quốc tịch — bằng tiếng Việt</h1>
          <p className="text-muted">Video bài học với người bản xứ, hơn 1.100 câu lý thuyết lái xe và 460 câu Leben in Deutschland có bản dịch, cùng hướng dẫn thủ tục cho người Việt ở Đức. Miễn phí.</p>
        </div>
        <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
          <LoginLink href="/register" className="btn btn-primary px-5 py-3 text-base">
            Đăng ký miễn phí
          </LoginLink>
          <a href="#thu-ngay" className="btn px-5 py-3 text-base">
            Thử ngay
          </a>
        </div>
      </section>

      <section id="thu-ngay" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="text-xl font-extrabold">Thử ngay, không cần tài khoản</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile href={first ? lessonPath(first.slug) : "/tieng-duc"} icon={Play} label={first ? `Bài học video · ${first.level}` : "Tiếng Đức"} title={first ? first.title : "Học tiếng Đức với video"}>
            <span className="text-sm text-muted">Nghe từng câu, nói theo và ghi âm để so với người bản xứ.</span>
          </Tile>
          <Tile href="/lai-xe/thi-thu" icon={Car} label="Lái xe hạng B" title="Thi thử lý thuyết 30 câu">
            <span className="text-sm text-muted">Chấm theo điểm lỗi như thi thật, có tiếng Việt.</span>
          </Tile>
          <Tile href="/leben-in-deutschland" icon={Landmark} label="Leben in Deutschland" title="Thi thử 33 câu">
            <span className="text-sm text-muted">Chọn bang của bạn, đúng 17 câu là đậu.</span>
          </Tile>
          <Tile href="/games" icon={Gamepad2} label="Game" title="Chơi game luyện từ vựng" tone="text-amber">
            <span className="text-sm text-muted">Mưa từ vựng, Der Die Das, nối từ…</span>
          </Tile>
        </div>
      </section>
    </>
  );
}

/** Đã đăng nhập: "hôm nay học gì" — mỗi ô 1 chạm là vào việc */
function UserTop({ user }: { user: User }) {
  const [cont] = unfinished(user.id, 1);
  const due = dueCount(user.id);
  const drive = summarize(drivingIds(), quizStats(user.id, "fuehrerschein"));
  const lidStats = quizStats(user.id, "lid");
  const lid = summarize(Object.keys(lidStats), lidStats);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Mascot className="size-12 shrink-0" />
        <h1 className="flex-1 text-xl leading-tight font-extrabold sm:text-2xl">Hallo, {user.name}! Hôm nay học gì?</h1>
        <TodayStreak />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cont ? (
          <Tile href={cont.href} icon={Play} label={`Học tiếp · ${percent(cont.p)}%`} title={cont.title} />
        ) : (
          <Tile href="/tieng-duc" icon={Play} label="Tiếng Đức" title="Chọn một bài học video" />
        )}
        {due ? (
          <Tile href="/vocab/notebook?review=1" icon={Layers} label="Ôn từ vựng" title={`${due} từ đến hạn ôn`} />
        ) : (
          <Tile href="/vocab" icon={Layers} label="Từ vựng" title="Không có từ đến hạn — học bộ từ mới" />
        )}
        <Tile
          href={drive.wrong ? "/lai-xe/on-tap" : "/lai-xe"}
          icon={drive.wrong ? RotateCcw : Car}
          label="Lái xe hạng B"
          title={drive.done ? (drive.wrong ? `Ôn ${drive.wrong} câu đang sai` : "Làm tiếp các chương") : "Bắt đầu ôn lý thuyết"}
        >
          <span className="text-xs text-muted tabular-nums">
            {drive.done}/{drive.total} câu · {drive.ok} đúng
          </span>
          <ProgressBar {...drive} total={drive.total} />
        </Tile>
        <Tile
          href={lid.wrong ? "/leben-in-deutschland/on-tap" : "/leben-in-deutschland"}
          icon={lid.wrong ? RotateCcw : ClipboardCheck}
          label="Leben in Deutschland"
          title={lid.done ? (lid.wrong ? `Ôn ${lid.wrong} câu đang sai` : "Làm tiếp hoặc thi thử") : "Bắt đầu ôn thi"}
        >
          <span className="text-xs text-muted tabular-nums">
            {lid.done}/{LID_TOTAL} câu · {lid.ok} đúng
          </span>
          <ProgressBar total={LID_TOTAL} ok={lid.ok} wrong={lid.wrong} />
        </Tile>
      </div>
    </section>
  );
}

async function Top() {
  await connection();
  const user = await getCurrentUser();
  return user ? <UserTop user={user} /> : <GuestTop />;
}

function SectionTitle({ title, href, more }: { title: string; href: string; more: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-extrabold text-link hover:underline">
        {more} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/** 6 bài hướng dẫn mới nhất + 4 tin mới nhất, mỗi báo 1 tin (để dải tin không toàn 1 nguồn) */
function loadFeed() {
  const seen = new Set<string>();
  const news = listNewsItems({ limit: 60 }).filter((it) => !seen.has(it.source) && seen.add(it.source));
  return { guides: listNewsPosts({ limit: 6 }), news: news.slice(0, 4), now: Date.now() };
}

/** Hướng dẫn mới + vài tin nước Đức hôm nay */
async function Feed() {
  await connection();
  after(() => refreshNews()?.catch((e) => console.error("[news]", e)));
  const { guides, news, now } = loadFeed();
  return (
    <>
      {guides.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle title="Hướng dẫn cho người Việt ở Đức" href="/huong-dan" more="Xem tất cả" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((p) => (
              <GuideCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
      {news.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle title="Tin nước Đức hôm nay" href="/tin-tuc" more="Xem tất cả tin" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {news.map((it) => (
              <NewsCard key={it.id} item={it} now={now} compact />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 md:p-6">
      <Suspense fallback={<div className="sticker h-48 animate-pulse motion-reduce:animate-none" />}>
        <Top />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Feed />
      </Suspense>
    </main>
  );
}
