import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, FileStack, Play } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listQuizExams } from "@/lib/db";
import { classInfo, prefs } from "@/lib/fuehrerschein";
import { ExamHistory } from "@/components/lai-xe/ExamHistory";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thi thử lý thuyết lái xe", description: "Thi thử lý thuyết lái xe Đức như thật: đề ngẫu nhiên theo hạng, 45 phút, chấm theo điểm lỗi." };

async function Start() {
  const { cls } = await prefs();
  const info = classInfo(cls);
  const user = await getCurrentUser();
  const history = user ? listQuizExams(user.id, "fuehrerschein", 10) : [];
  const zusatz = info.exam.questions - info.exam.grundstoff;
  return (
    <>
      <section className="sticker flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-14 min-w-14 items-center justify-center rounded-2xl border-2 border-ink bg-red px-2 text-xl font-extrabold text-white">{cls}</span>
          <div>
            <h2 className="text-xl font-extrabold">Prüfungssimulation · hạng {info.name}</h2>
            <p className="text-sm text-muted">{info.vi}</p>
          </div>
        </div>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            <b>{info.exam.questions} câu</b>: {info.exam.grundstoff} câu phần cơ bản + {zusatz} câu phần riêng hạng {cls}
          </li>
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            <Clock className="mr-1 inline size-4" />
            <b>{info.exam.minutes} phút</b>, hết giờ tự nộp bài
          </li>
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            Đậu khi <b>≤ {info.exam.maxErrorPoints} điểm lỗi</b> (mỗi câu sai 2–5 điểm, câu bỏ trống tính là sai)
          </li>
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            Trượt nếu <b>sai từ 2 câu 5 điểm</b>, kể cả khi tổng chỉ 10 điểm
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href="/lai-xe/thi-thu/lam-bai" className="btn btn-red">
            <Play className="size-4" /> Bắt đầu thi
          </Link>
          {cls === "B" && (
            <Link href="/lai-xe/de-mau" className="btn">
              <FileStack className="size-4" /> Làm đề mẫu chính thức
            </Link>
          )}
          <Link href="/lai-xe/hang" className="btn">
            Đổi hạng
          </Link>
        </div>
      </section>
      {user && history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">Bài thi gần đây</h2>
          <ExamHistory exams={history} />
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link href="/lai-xe" className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold">Thi thử</h1>
      </div>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Start />
      </Suspense>
    </main>
  );
}
