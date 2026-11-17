import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, Car, ChevronDown, Flag, RotateCcw, Settings, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { BOGEN_COUNT, CLASS_ORDER, DEFAULT_CLASS, WEB_BOGEN_LIMIT, classInfo, classQuestionIds, prefs, totalQuestions } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, faqLd, fmtNum, quizPageMeta } from "@/lib/laixe/seo";
import { summarize } from "@/lib/quiz/types";
import { ActionCard, BigCard, QuizProgress } from "@/components/quiz/QuizParts";
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
      {/* Đầu trang: bìa vở vàng + nhãn — tiến trình nằm ngay trong nhãn (cùng khuôn với LiD) */}
      <PageHeader
        sec="laixe"
        icon={Car}
        mascot
        title="Bằng lái xe Đức"
        sub={`Ôn thi lý thuyết hạng ${cls} · Theorieprüfung · bộ đề từ 01.04.2025`}
        meta={<span className="rounded-md bg-white/85 max-sm:hidden px-2 py-0.5 font-display text-base font-extrabold text-[#16203a] tabular-nums">Hạng {cls}</span>}
        actions={
          <Link href={settingsHref} className="btn btn-sm">
            <Settings className="size-4" /> {user ? "Cài đặt" : "Đổi hạng"}
          </Link>
        }
      >
        <QuizProgress {...all} />
      </PageHeader>

      {!user && (
        <p className="alert alert-info">
          <span>
            <Link href="/login?next=/lai-xe" className="font-bold underline underline-offset-2">
              Đăng nhập
            </Link>{" "}
            để lưu tiến trình, câu sai và lịch sử thi.
          </span>
        </p>
      )}

      {/* 2 cuốn vở lớn: Học / Thi thử (cuốn chính) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <BigCard href="/lai-xe/hoc" icon={BookOpen} title="Học theo chủ đề" text="Theo chương, có giải thích" cta="Học" />
        <BigCard href="/lai-xe/thi-thu" icon={Flag} title="Thi thử" text={cls === "B" ? "Đề ngẫu nhiên & đề mẫu" : `${info.exam.questions} câu · ${info.exam.minutes} phút`} cta="Vào thi" primary />
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
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ngôi sao ở câu hỏi để đánh dấu"}
        />
        <ActionCard href="/lai-xe/thong-ke" icon={BarChart3} title="Thống kê" locked={!user} text={user ? "Kết quả và tiến trình" : "Đăng nhập để xem thống kê"} />
      </div>

      {/* Câu hỏi thường gặp: nội dung cho SEO (FAQPage), xếp sau menu như phần phụ — cùng khuôn với LiD */}
      <section className="card flex flex-col gap-1 sm:p-6" aria-labelledby="lx-faq">
        <h2 id="lx-faq" className="section-title mb-1">
          Câu hỏi thường gặp
        </h2>
        <div className="flex flex-col">
          {FAQ.map((f) => (
            <details key={f.q} className="quiz-faq group">
              <summary>
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
