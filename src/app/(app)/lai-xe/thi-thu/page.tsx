import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, FileStack, Play } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listQuizExams } from "@/lib/db";
import { DEFAULT_CLASS, classInfo, prefs } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, quizPageMeta } from "@/lib/laixe/seo";
import { ExamHistory } from "@/components/laixe/ExamHistory";
import { ListSkeleton } from "@/components/Skeleton";

const B = classInfo(DEFAULT_CLASS).exam;

// Trang bắt đầu thi thử công khai → index; màn làm bài (/lam-bai) và kết quả từng bài (/[id]) thì noindex
export const metadata: Metadata = quizPageMeta({
  path: "/lai-xe/thi-thu",
  title: `Thi thử lý thuyết lái xe Đức online – ${B.questions} câu như thật`,
  description: `Thi thử lý thuyết bằng lái xe Đức miễn phí: đề ngẫu nhiên ${B.questions} câu theo hạng, ${B.minutes} phút, chấm theo điểm lỗi như thi thật, xem lại câu sai bằng tiếng Việt.`,
});

async function Start() {
  const { cls } = await prefs();
  const info = classInfo(cls);
  const user = await getCurrentUser();
  const history = user ? listQuizExams(user.id, "fuehrerschein", 10) : [];
  const zusatz = info.exam.questions - info.exam.grundstoff;
  return (
    <>
      <section className="card flex flex-col gap-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="icon-bubble tint-accent h-14 min-w-14 px-2 font-display text-2xl font-extrabold" aria-hidden>
            {cls}
          </span>
          <div className="min-w-0">
            <h2 className="section-title">Prüfungssimulation · hạng {info.name}</h2>
            <p className="text-sm text-muted">{info.vi}</p>
          </div>
        </div>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="surface">
            <b>{info.exam.questions} câu</b>: {info.exam.grundstoff} câu phần cơ bản + {zusatz} câu phần riêng hạng {cls}
          </li>
          <li className="surface">
            <Clock className="mr-1 inline size-4 align-[-2px] text-muted" aria-hidden />
            <b>{info.exam.minutes} phút</b>, hết giờ tự nộp bài
          </li>
          <li className="surface">
            Đậu khi <b>≤ {info.exam.maxErrorPoints} điểm lỗi</b> (mỗi câu sai 2–5 điểm, câu bỏ trống tính là sai)
          </li>
          <li className="surface">
            Trượt nếu <b>sai từ 2 câu 5 điểm</b>, kể cả khi tổng chỉ 10 điểm
          </li>
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/lai-xe/thi-thu/lam-bai" className="btn btn-lg btn-primary">
            <Play className="size-4" /> Bắt đầu thi
          </Link>
          {cls === "B" && (
            <Link href="/lai-xe/de-mau" className="btn btn-lg">
              <FileStack className="size-4" /> Làm đề mẫu chính thức
            </Link>
          )}
          <Link href="/lai-xe/hang" className="btn btn-lg">
            Đổi hạng
          </Link>
        </div>
      </section>
      {user && history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Bài thi gần đây</h2>
          <ExamHistory exams={history} />
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <main className="page">
      <JsonLd data={breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"], ["Thi thử", "/lai-xe/thi-thu"]])} />
      <div className="flex items-center gap-2">
        <Link href="/lai-xe" className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="page-title">Thi thử lý thuyết lái xe</h1>
      </div>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Start />
      </Suspense>
    </main>
  );
}
