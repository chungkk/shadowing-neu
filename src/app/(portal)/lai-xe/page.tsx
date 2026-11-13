import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type { ComponentType } from "react";
import { ArrowLeftRight, BarChart3, BookOpen, ChevronRight, Flag, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizStats } from "@/lib/db";
import { classInfo, classQuestionIds, prefs } from "@/lib/fuehrerschein";
import { LANG_NAMES } from "@/lib/fuehrerschein-rules";
import { summarize } from "@/lib/quiz-types";
import { ProgressBar } from "@/components/QuizParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Lý thuyết lái xe",
  description: "Luyện thi lý thuyết bằng lái xe Đức mọi hạng (B, A, C, D…): câu hỏi chính thức kèm bản dịch tiếng Việt, giải thích, đề mẫu và thi thử như thật.",
};

/** Thẻ lớn ở giữa màn hình chính (như app): Học theo chủ đề / Thi thử */
function BigCard({ href, icon: Icon, title, text, red }: { href: string; icon: ComponentType<{ className?: string }>; title: string; text: string; red?: boolean }) {
  return (
    <Link
      href={href}
      className={`sticker sticker-link flex min-h-40 flex-col items-center justify-center gap-1 p-4 text-center sm:min-h-52 ${red ? "bg-red text-white" : ""}`}
    >
      <span className={`mb-2 flex size-14 items-center justify-center rounded-full border-2 sm:size-20 ${red ? "border-white bg-white/20" : "border-gold bg-gold/15 text-gold"}`}>
        <Icon className="size-7 sm:size-9" />
      </span>
      <span className="text-lg font-extrabold sm:text-2xl">{title}</span>
      <span className={`text-sm ${red ? "text-white/75" : "text-muted"}`}>{text}</span>
    </Link>
  );
}

/** Dòng menu phụ (Thống kê) */
function ListCard({ href, icon: Icon, title, text, disabled }: { href: string; icon: ComponentType<{ className?: string }>; title: string; text: string; disabled?: boolean }) {
  const body = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card-2 text-gold">
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-extrabold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
      {!disabled && <ChevronRight className="size-5 shrink-0 text-muted" />}
    </>
  );
  if (disabled) return <div className="sticker flex items-center gap-3 p-3 opacity-60">{body}</div>;
  return (
    <Link href={href} className="sticker sticker-link flex items-center gap-3 p-3">
      {body}
    </Link>
  );
}

async function Home() {
  const { cls, lang } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "fuehrerschein") : {};
  const info = classInfo(cls);
  const ids = classQuestionIds(cls);
  const all = summarize(ids, stats);
  const settingsHref = user ? "/settings#lai-xe" : "/lai-xe/hang";

  return (
    <>
      {/* Đầu trang: tiêu đề + nút cài đặt, thẻ hạng đang học (bấm để đổi) */}
      <section className="sticker flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <h1 className="min-w-0 flex-1 text-2xl leading-tight font-extrabold sm:text-3xl">Bằng lái xe Đức</h1>
          <Link href={settingsHref} className="btn-icon" aria-label="Cài đặt lái xe">
            <Settings className="size-5" />
          </Link>
        </div>
        <Link href={settingsHref} className="flex items-center gap-3 rounded-2xl border-2 border-ink/20 p-2.5 transition hover:border-ink" aria-label={`Đổi hạng bằng (đang học hạng ${cls})`}>
          <span className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-gold px-1.5 text-base font-extrabold text-black">{cls}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-extrabold">
              Hạng {info.name} · {info.vi}
            </span>
            <span className="truncate text-sm text-muted">
              {ids.length.toLocaleString("vi-VN")} câu · thi {info.exam.questions} câu, tối đa {info.exam.maxErrorPoints} điểm lỗi · bản dịch {LANG_NAMES[lang]}
            </span>
          </span>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card-2">
            <ArrowLeftRight className="size-4" />
          </span>
        </Link>
      </section>

      {/* Tiến trình */}
      <section className="sticker flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Tiến trình</span>
          <span className="rounded-full bg-card-2 px-2.5 py-1 text-xs font-bold text-muted">Bộ đề từ 01.04.2025</span>
        </div>
        <ProgressBar {...all} />
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" /> Đúng <b className="text-foreground tabular-nums">{all.ok}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red" /> Sai <b className="text-foreground tabular-nums">{all.wrong}</b>
          </span>
          <span className="ml-auto tabular-nums">
            <b className="text-foreground">{all.done}</b> / {all.total}
          </span>
        </div>
        {!user && (
          <p className="text-sm text-muted">
            <Link href="/login?next=/lai-xe" className="font-bold underline underline-offset-2">
              Đăng nhập
            </Link>{" "}
            để lưu tiến trình, câu sai và lịch sử thi.
          </p>
        )}
      </section>

      {/* 2 thẻ lớn */}
      <div className="grid grid-cols-2 gap-3">
        <BigCard href="/lai-xe/hoc" icon={BookOpen} title="Học theo chủ đề" text="Học lý thuyết theo chủ đề" />
        <BigCard href="/lai-xe/thi-thu" icon={Flag} title="Thi thử" text={cls === "B" ? "Thi thử & bộ đề mẫu" : `${info.exam.questions} câu · ${info.exam.minutes} phút`} red />
      </div>

      {/* Menu phụ */}
      <ListCard href="/lai-xe/thong-ke" icon={BarChart3} title="Thống kê" text={user ? "Xem kết quả & tiến trình" : "Đăng nhập để xem thống kê"} disabled={!user} />
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </main>
  );
}
