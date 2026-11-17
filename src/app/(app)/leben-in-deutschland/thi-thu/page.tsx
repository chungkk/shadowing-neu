import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CircleCheck, Clock, Flag, ListChecks, LogIn, Play } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listQuizExams } from "@/lib/db";
import { EXAM, EXAM_TOTAL, STATES, getState, prefs } from "@/lib/lid";
import { ExamHistory } from "@/components/laixe/ExamHistory";
import { LidShell, Wappen } from "@/components/lid/LidParts";
import { SubHeader } from "@/components/quiz/QuizParts";
import { StatePicker } from "@/components/lid/StatePicker";
import { LoginLink } from "@/components/auth/LoginDialog";
import { ListSkeleton } from "@/components/Skeleton";
import { JsonLd, breadcrumbLd, quizPageMeta } from "@/lib/laixe/seo";

// Trang bắt đầu thi thử công khai → index; màn làm bài (/lam-bai) và kết quả từng bài (/[id]) thì noindex
export const metadata: Metadata = quizPageMeta({
  path: "/leben-in-deutschland/thi-thu",
  title: `Thi thử Leben in Deutschland – Einbürgerungstest ${EXAM_TOTAL} câu`,
  description: `Thi thử Leben in Deutschland / Einbürgerungstest như thật: ${EXAM_TOTAL} câu (${EXAM.general} câu chung + ${EXAM.state} câu của bang), ${EXAM.minutes} phút, đúng ${EXAM.pass} câu là đậu, xem lại câu sai bằng tiếng Việt.`,
});

/** Màn bắt đầu thi như Lái xe: thẻ luật thi + nút chính "Bắt đầu thi" */
async function Start() {
  const { state } = await prefs();
  const user = await getCurrentUser();
  const history = user ? listQuizExams(user.id, "lid", 10) : [];
  const rules: { icon: typeof Clock; text: ReactNode }[] = [
    { icon: ListChecks, text: <><b>{EXAM_TOTAL} câu</b>: {EXAM.general} câu chung + {EXAM.state} câu theo bang {state.name}</> },
    { icon: Clock, text: <><b>{EXAM.minutes} phút</b>, hết giờ tự nộp bài</> },
    { icon: CircleCheck, text: <>Đậu khi <b>đúng ít nhất {EXAM.pass}/{EXAM_TOTAL} câu</b></> },
  ];
  return (
    <>
      <section className="card flex flex-col gap-5 sm:p-6" aria-labelledby="lid-rules">
        <div className="flex items-center gap-3">
          <span className="icon-bubble tint-sec size-12" aria-hidden>
            <Wappen code={state.code} className="h-9 w-7" />
          </span>
          <div className="min-w-0">
            <h2 id="lid-rules" className="section-title">
              Einbürgerungstest · {state.name}
            </h2>
            <p className="text-sm text-muted">Thi thử Leben in Deutschland như thật</p>
          </div>
        </div>
        <ul className="flex flex-col">
          {rules.map((r, i) => (
            <li key={i} className="flex items-start gap-3 border-b border-line py-3 text-[0.95rem] leading-snug last:border-b-0 dark:border-border">
              <r.icon className="mt-0.5 size-5 shrink-0 text-sec-text" aria-hidden />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {user ? (
            <Link href="/leben-in-deutschland/thi-thu/lam-bai" prefetch={false} className="btn btn-lg btn-primary">
              <Play className="size-4" /> Bắt đầu thi
            </Link>
          ) : (
            <LoginLink href={`/login?next=${encodeURIComponent("/leben-in-deutschland/thi-thu")}`} className="btn btn-lg btn-primary">
              <LogIn className="size-4" /> Đăng nhập để thi thử
            </LoginLink>
          )}
          <StatePicker states={STATES} current={state.code} variant="button" />
        </div>
        {!user && <p className="field-hint">Thi thử cần tài khoản (miễn phí) để chấm điểm, lưu lịch sử và ôn lại câu sai.</p>}
      </section>
      {user && history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Bài thi gần đây</h2>
          <ExamHistory exams={history} module="lid" stateName={(c) => getState(c)?.name ?? c} />
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <LidShell>
      <JsonLd data={breadcrumbLd([["Leben in Deutschland", "/leben-in-deutschland"], ["Thi thử", "/leben-in-deutschland/thi-thu"]])} />
      <SubHeader sec="lid" back="/leben-in-deutschland" backLabel="Leben in Deutschland" icon={Flag} title="Thi thử" sub="Đề ngẫu nhiên 33 câu như bài thi thật — đề chỉ có tiếng Đức." />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Start />
      </Suspense>
    </LidShell>
  );
}
