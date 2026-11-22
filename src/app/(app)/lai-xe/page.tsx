import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChevronDown, Clock, ShieldAlert } from "lucide-react";
import {
  ChristmasBookIcon as BookOpen,
  ChristmasCarIcon as Car,
  ChristmasChartIcon as BarChart3,
  ChristmasFileStackIcon as FileStack,
  ChristmasFlagIcon as Flag,
  ChristmasSettingsIcon as Settings,
  ChristmasStarIcon as Star,
  ChristmasWrongIcon as RotateCcw,
} from "@/components/FestiveIcons";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { BOGEN_COUNT, CLASS_ORDER, DEFAULT_CLASS, WEB_BOGEN_LIMIT, classInfo, classQuestionIds, isGrund, prefs, totalQuestions } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, faqLd, fmtNum, quizPageMeta } from "@/lib/laixe/seo";
import { summarize } from "@/lib/quiz/types";
import { ActionCard, BigCard, ProgressBar, QuizProgress } from "@/components/quiz/QuizParts";
import PageHeader from "@/components/PageHeader";
import { ListSkeleton } from "@/components/Skeleton";

const TOTAL = totalQuestions();
const B = classInfo(DEFAULT_CLASS).exam;
const B_COUNT = classQuestionIds(DEFAULT_CLASS).length;

export const metadata: Metadata = quizPageMeta({
  path: "/lai-xe",
  title: `Thi lý thuyết lái xe Đức bằng tiếng Việt – ${fmtNum(Math.floor(TOTAL / 100) * 100)}+ câu hỏi`,
  description: `Ôn thi lý thuyết bằng lái xe Đức (Führerschein) bằng tiếng Việt: ${fmtNum(TOTAL)} câu hỏi chính thức cho ${CLASS_ORDER.length} hạng B, A, C, D…, giải thích, đề mẫu, thi thử.`,
});

const FAQ = [
  {
    q: "Bài thi lý thuyết lái xe hạng B có bao nhiêu câu?",
    a: `${B.questions} câu trắc nghiệm, làm trong ${B.minutes} phút: ${B.grundstoff} câu phần cơ bản (Grundstoff) chung cho mọi hạng và ${B.questions - B.grundstoff} câu phần riêng của hạng B (Zusatzstoff). Mỗi câu có thể có nhiều đáp án đúng.`,
  },
  {
    q: "Sai bao nhiêu thì trượt?",
    a: `Mỗi câu mang 2–5 điểm lỗi. Hạng B được sai tối đa ${B.maxErrorPoints} điểm lỗi; sai từ 2 câu 5 điểm là trượt dù tổng điểm lỗi chưa vượt mức. Chọn thiếu hoặc thừa một đáp án cũng tính là sai cả câu.`,
  },
  {
    q: "Trên trang có bao nhiêu câu hỏi?",
    a: `${fmtNum(TOTAL)} câu của bộ câu hỏi chính thức (amtlicher Fragenkatalog) cho ${CLASS_ORDER.length} hạng bằng; riêng hạng B có ${fmtNum(B_COUNT)} câu. Bạn chọn hạng đang học, trang chỉ hiện các câu của hạng đó.`,
  },
  {
    q: "Có bản dịch tiếng Việt không?",
    a: "Có — mọi câu hỏi và phương án đều có bản dịch tiếng Việt, phần lớn câu có thêm giải thích ngắn vì sao đáp án đúng. Câu gốc tiếng Đức luôn hiện; bản dịch bật / tắt bằng nút „Hiện bản dịch\", màn thi thử mặc định ẩn bản dịch.",
  },
  {
    q: "Có đề mẫu chính thức để luyện không?",
    a: `Có ${BOGEN_COUNT} đề mẫu chính thức hạng B (Musterbögen), mỗi đề ${B.questions} câu. Trên web làm thử được ${WEB_BOGEN_LIMIT} đề đầu, trọn bộ ${BOGEN_COUNT} đề có trong app HalloVN. Ngoài ra có thi thử với đề ngẫu nhiên cho mọi hạng.`,
  },
];

async function Home() {
  const { cls } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "fuehrerschein") : {};
  const info = classInfo(cls);
  const ids = classQuestionIds(cls);
  const all = summarize(ids, stats);
  const grund = summarize(ids.filter(isGrund), stats);
  const zusatz = summarize(ids.filter((id) => !isGrund(id)), stats);
  const marked = user ? quizBookmarks(user.id, "fuehrerschein").length : 0;
  const settingsHref = user ? "/settings#hoc-tap" : "/lai-xe/hang";

  return (
    <>
      <PageHeader
        sec="laixe"
        icon={Car}
        mascot
        title="Lý thuyết lái xe Đức"
        sub={`Ôn thi Führerschein hạng ${cls} (${info.vi}) · bộ đề chính thức từ 01.04.2025`}
        meta={<span className="badge badge-gold font-mono tabular-nums">Hạng {cls}</span>}
        actions={
          <Link href={settingsHref} className="btn btn-sm">
            <Settings className="size-3.5" /> {user ? "Đổi hạng / Cài đặt" : "Đổi hạng"}
          </Link>
        }
      />

      {!user && (
        <p className="alert alert-info">
          <span>
            <Link href="/login?next=/lai-xe" className="font-semibold underline underline-offset-2">
              Đăng nhập
            </Link>{" "}
            để lưu tiến độ học, tự động gom câu sai và theo dõi lịch sử thi thử.
          </span>
        </p>
      )}

      {/* Bảng cấu trúc kỳ thi & tiến độ Grundstoff / Zusatzstoff (đặc thù của Führerschein) */}
      <section className="card flex flex-col gap-4 p-5" aria-label="Tiến độ và cấu trúc bài thi lái xe">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
            <span className="badge badge-gold">Hạng {cls}</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="size-3.5" aria-hidden /> {info.exam.questions} câu · {info.exam.minutes} phút
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <ShieldAlert className="size-3.5" aria-hidden /> Tối đa {info.exam.maxErrorPoints} điểm lỗi
            </span>
          </div>
          <Link href="/lai-xe/thong-ke" className="text-xs font-semibold text-link hover:underline">
            Xem thống kê chi tiết
          </Link>
        </div>

        <QuizProgress {...all} />

        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <Link href="/lai-xe/hoc/grund" className="group surface flex flex-col gap-1.5 p-3 transition-colors hover:bg-card-2/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground group-hover:text-sec-text">Grundstoff (cơ bản)</span>
              <span className="font-mono text-muted tabular-nums">
                {grund.done}/{grund.total} câu
              </span>
            </div>
            <ProgressBar {...grund} />
          </Link>
          <Link href="/lai-xe/hoc/zusatz" className="group surface flex flex-col gap-1.5 p-3 transition-colors hover:bg-card-2/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground group-hover:text-sec-text">Zusatzstoff (riêng hạng {cls})</span>
              <span className="font-mono text-muted tabular-nums">
                {zusatz.done}/{zusatz.total} câu
              </span>
            </div>
            <ProgressBar {...zusatz} />
          </Link>
        </div>
      </section>

      {/* 2 lối vào chính */}
      <div className="grid gap-4 sm:grid-cols-2">
        <BigCard
          href="/lai-xe/hoc"
          icon={BookOpen}
          title="Học theo chương & chủ đề"
          text={`Luyện ${fmtNum(ids.length)} câu có bản dịch tiếng Việt và giải thích chi tiết từng đáp án.`}
          badge={`${fmtNum(ids.length)} câu`}
          cta="Mở danh sách chương"
        />
        <BigCard
          href="/lai-xe/thi-thu"
          icon={Flag}
          title="Thi thử chuẩn phần mềm Đức"
          text={`${info.exam.questions} câu (${info.exam.grundstoff} cơ bản + ${info.exam.questions - info.exam.grundstoff} riêng hạng ${cls}), chấm điểm lỗi thật.`}
          badge={`${info.exam.minutes} phút`}
          cta="Vào phòng thi"
          primary
        />
      </div>

      {/* Lối tắt Đề mẫu chính thức (riêng hạng B) */}
      {cls === "B" && (
        <Link href="/lai-xe/de-mau" className="group card card-link flex items-center gap-3.5 p-4 sm:px-5">
          <span className="icon-bubble tint-gold size-10">
            <FileStack className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Đề mẫu chính thức hạng B (Musterbögen)</span>
            <span className="text-xs text-muted sm:text-sm">Làm thử {WEB_BOGEN_LIMIT} đề chuẩn trên web — chọn chế độ Đọc, Luyện hoặc Thi có giờ.</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-sec-text transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}

      {/* Công cụ ôn tập phụ */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/lai-xe/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          locked={!user}
          disabled={!!user && !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu cần làm lại` : "Chưa có câu sai nào"}
        />
        <ActionCard
          href="/lai-xe/danh-dau"
          icon={Star}
          title="Câu đánh dấu"
          locked={!user}
          disabled={!!user && !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu đã lưu` : "Bấm ngôi sao ở câu hỏi để lưu"}
        />
        <ActionCard href="/lai-xe/thong-ke" icon={BarChart3} title="Thống kê & lịch sử" locked={!user} text={user ? "Biểu đồ & 10 bài thi gần nhất" : "Đăng nhập để xem thống kê"} />
      </div>

      {/* FAQPage */}
      <section className="card flex flex-col gap-1 p-5 sm:p-6" aria-labelledby="lx-faq">
        <h2 id="lx-faq" className="section-title mb-1">
          Câu hỏi thường gặp
        </h2>
        <div className="flex flex-col">
          {FAQ.map((f) => (
            <details key={f.q} className="quiz-faq group">
              <summary className="text-sm sm:text-[0.9375rem]">
                <span className="min-w-0 flex-1">{f.q}</span>
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <p className="text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main className="page" data-sec="laixe">
      <JsonLd data={[faqLd(FAQ), breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"]])]} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </main>
  );
}
