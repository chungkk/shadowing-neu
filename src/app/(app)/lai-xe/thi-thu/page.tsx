import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CircleCheck, Clock, ListChecks, LogIn, Play, TriangleAlert } from "lucide-react";
import {
  ChristmasFileStackIcon as FileStack,
  ChristmasFlagIcon as Flag,
} from "@/components/FestiveIcons";
import { SubHeader } from "@/components/quiz/QuizParts";
import { LoginLink } from "@/components/auth/LoginDialog";
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
  const rules: { icon: typeof Clock; text: ReactNode }[] = [
    { icon: ListChecks, text: <><b>{info.exam.questions} câu</b>: {info.exam.grundstoff} câu phần cơ bản + {zusatz} câu phần riêng hạng {cls}</> },
    { icon: Clock, text: <><b>{info.exam.minutes} phút</b>, hết giờ tự nộp bài</> },
    { icon: CircleCheck, text: <>Đậu khi <b>≤ {info.exam.maxErrorPoints} điểm lỗi</b> (mỗi câu sai 2–5 điểm, câu bỏ trống tính là sai)</> },
    { icon: TriangleAlert, text: <>Trượt nếu <b>sai từ 2 câu 5 điểm</b>{info.exam.maxErrorPoints >= 10 ? ", kể cả khi tổng chỉ 10 điểm" : ""}</> },
  ];
  return (
    <>
      <section className="card flex flex-col gap-5 sm:p-6" aria-labelledby="lx-rules">
        <div className="flex items-center gap-3">
          <span className="icon-bubble tint-sec h-12 min-w-12 px-2 font-display text-xl font-extrabold" aria-hidden>
            {cls}
          </span>
          <div className="min-w-0">
            <h2 id="lx-rules" className="section-title">
              Prüfungssimulation · hạng {info.name}
            </h2>
            <p className="text-sm text-muted">{info.vi}</p>
          </div>
        </div>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {rules.map((r, i) => (
            <li key={i} className="flex items-start gap-3 border-b border-line py-3 text-[0.95rem] leading-snug last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0 dark:border-border">
              <r.icon className="mt-0.5 size-5 shrink-0 text-sec-text" aria-hidden />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {user ? (
            <Link href="/lai-xe/thi-thu/lam-bai" prefetch={false} className="btn btn-lg btn-primary">
              <Play className="size-4" /> Bắt đầu thi
            </Link>
          ) : (
            <LoginLink href={`/login?next=${encodeURIComponent("/lai-xe/thi-thu")}`} className="btn btn-lg btn-primary">
              <LogIn className="size-4" /> Đăng nhập để thi thử
            </LoginLink>
          )}
          {cls === "B" && (
            <Link href="/lai-xe/de-mau" className="btn btn-lg">
              <FileStack className="size-4" /> Làm đề mẫu chính thức
            </Link>
          )}
          <Link href="/lai-xe/hang" className="btn btn-lg btn-ghost">
            Đổi hạng
          </Link>
        </div>
        {!user && <p className="field-hint">Thi thử cần tài khoản (miễn phí) để chấm điểm lỗi, lưu lịch sử và ôn lại câu sai.</p>}
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
    <main className="page" data-sec="laixe">
      <JsonLd data={breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"], ["Thi thử", "/lai-xe/thi-thu"]])} />
      <SubHeader sec="laixe" back="/lai-xe" backLabel="Lái xe" icon={Flag} title="Thi thử lý thuyết lái xe" sub="Đề ngẫu nhiên theo hạng, chấm điểm lỗi như phần mềm thi thật." />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Start />
      </Suspense>
    </main>
  );
}
