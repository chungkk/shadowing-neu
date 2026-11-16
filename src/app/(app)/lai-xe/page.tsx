import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, Car, ChevronDown, Flag, RotateCcw, Settings, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { BOGEN_COUNT, CLASS_ORDER, DEFAULT_CLASS, WEB_BOGEN_LIMIT, classInfo, classQuestionIds, prefs, totalQuestions } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, faqLd, fmtNum, quizPageMeta } from "@/lib/laixe/seo";
import { summarize } from "@/lib/quiz/types";
import { ActionCard, BigCard, ProgressBar } from "@/components/quiz/QuizParts";
import { ListSkeleton } from "@/components/Skeleton";

const TOTAL = totalQuestions();
const B = classInfo(DEFAULT_CLASS).exam;
const B_COUNT = classQuestionIds(DEFAULT_CLASS).length;

export const metadata: Metadata = quizPageMeta({
  path: "/lai-xe",
  title: `Thi lý thuyết lái xe Đức bằng tiếng Việt – ${fmtNum(Math.floor(TOTAL / 100) * 100)}+ câu hỏi`,
  description: `Ôn thi lý thuyết bằng lái xe Đức (Führerschein) bằng tiếng Việt: ${fmtNum(TOTAL)} câu hỏi chính thức cho ${CLASS_ORDER.length} hạng B, A, C, D…, giải thích, đề mẫu, thi thử.`,
});

// Câu hỏi thường gặp: hiện trên trang + dữ liệu có cấu trúc FAQPage (nội dung hai nơi phải giống nhau)
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
  const marked = user ? quizBookmarks(user.id, "fuehrerschein").length : 0;
  const settingsHref = user ? "/settings#lai-xe" : "/lai-xe/hang";

  return (
    <>
      {/* Đầu trang: tiêu đề + phụ đề + nút cài đặt (đổi hạng/ngôn ngữ trong Cài đặt) — cùng khuôn với LiD */}
      <section className="sticker hero p-4 sm:p-6" style={{ ["--hero" as string]: "var(--gold)" }}>
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="icon-bubble tint-gold relative size-14 rounded-3xl sm:size-20" aria-hidden>
            <Car className="size-7 sm:size-10" />
            <span className="badge badge-accent absolute -right-1.5 -bottom-1.5 border-2 border-card px-1.5 font-display text-sm">{cls}</span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="page-title">Bằng lái xe Đức</h1>
            <p className="text-sm text-muted sm:text-base">Ôn thi lý thuyết hạng {cls} · Theorieprüfung</p>
          </div>
          <Link href={settingsHref} className="btn-icon self-start" aria-label="Cài đặt lái xe">
            <Settings className="size-5" />
          </Link>
        </div>
      </section>

      {/* Tiến trình */}
      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="label text-muted">Tiến trình</h2>
          <span className="badge badge-muted">Bộ đề từ 01.04.2025</span>
        </div>
        <ProgressBar {...all} />
        <div className="flex items-center gap-4 text-sm font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-accent" /> Đúng <b className="text-foreground tabular-nums">{all.ok}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red" /> Sai <b className="text-foreground tabular-nums">{all.wrong}</b>
          </span>
          <span className="ml-auto tabular-nums">
            <b className="text-foreground">{all.done}</b> / {all.total}
          </span>
        </div>
        {!user && (
          <p className="alert alert-info">
            <span>
              <Link href="/login?next=/lai-xe" className="font-extrabold underline underline-offset-2">
                Đăng nhập
              </Link>{" "}
              để lưu tiến trình, câu sai và lịch sử thi.
            </span>
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

      {/* Câu hỏi thường gặp: nội dung cho SEO (FAQPage), xếp sau menu như phần phụ — cùng khuôn với LiD */}
      <section className="card flex flex-col gap-3 sm:p-6" aria-labelledby="lx-faq">
        <h2 id="lx-faq" className="section-title">
          Câu hỏi thường gặp
        </h2>
        {FAQ.map((f) => (
          <details key={f.q} className="quiz-faq group">
            <summary>
              <span className="min-w-0 flex-1">{f.q}</span>
              <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main className="page">
      <JsonLd data={[faqLd(FAQ), breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"]])]} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </main>
  );
}
