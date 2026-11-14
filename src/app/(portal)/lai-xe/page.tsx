import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, Flag, RotateCcw, Settings, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { classInfo, classQuestionIds, prefs } from "@/lib/fuehrerschein";
import { summarize } from "@/lib/quiz-types";
import { ActionCard, BigCard, ProgressBar } from "@/components/QuizParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Lý thuyết lái xe",
  description: "Luyện thi lý thuyết bằng lái xe Đức mọi hạng (B, A, C, D…): câu hỏi chính thức kèm bản dịch tiếng Việt, giải thích, đề mẫu và thi thử như thật.",
};

async function Home() {
  const { cls } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "fuehrerschein") : {};
  const info = classInfo(cls);
  const ids = classQuestionIds(cls);
  const all = summarize(ids, stats);
  const marked = user ? quizBookmarks(user.id, "fuehrerschein").length : 0;
  const settingsHref = user ? "/settings#lai-xe" : "/lai-xe/hang";

  return (
    <>
      {/* Đầu trang: tiêu đề + phụ đề + nút cài đặt (đổi hạng/ngôn ngữ trong Cài đặt) — cùng khuôn với LiD */}
      <section className="sticker p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Bằng lái xe Đức</h1>
            <p className="text-sm text-muted">Ôn thi lý thuyết hạng {cls} · Theorieprüfung</p>
          </div>
          <Link href={settingsHref} className="btn-icon" aria-label="Cài đặt lái xe">
            <Settings className="size-5" />
          </Link>
        </div>
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

      {/* 2 thẻ lớn: Học / Thi thử (thẻ chính) */}
      <div className="grid grid-cols-2 gap-3">
        <BigCard href="/lai-xe/hoc" icon={BookOpen} title="Học theo chủ đề" text="Học lý thuyết theo chủ đề" />
        <BigCard href="/lai-xe/thi-thu" icon={Flag} title="Thi thử" text={cls === "B" ? "Thi thử & bộ đề mẫu" : `${info.exam.questions} câu · ${info.exam.minutes} phút`} primary />
      </div>

      {/* Menu phụ — cùng 3 mục, cùng thứ tự với LiD */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/lai-xe/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          locked={!user}
          disabled={!!user && !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
        <ActionCard
          href="/lai-xe/danh-dau"
          icon={Star}
          title="Đánh dấu"
          locked={!user}
          disabled={!!user && !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ⭐ ở câu hỏi để đánh dấu"}
        />
        <ActionCard href="/lai-xe/thong-ke" icon={BarChart3} title="Thống kê" locked={!user} text={user ? "Kết quả và tiến trình" : "Đăng nhập để xem thống kê"} />
      </div>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </main>
  );
}
