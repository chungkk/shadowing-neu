import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, ChevronDown, Flag, Landmark, RotateCcw, Settings, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { EXAM, EXAM_TOTAL, STATES, generalCount, generalIds, prefs, stateIds } from "@/lib/lid";
import { JsonLd, breadcrumbLd, faqLd, quizPageMeta } from "@/lib/laixe/seo";
import { summarize } from "@/lib/quiz/types";
import { ActionCard, BigCard, QuizProgress } from "@/components/quiz/QuizParts";
import PageHeader from "@/components/PageHeader";
import { StatePicker } from "@/components/lid/StatePicker";
import { Wappen } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

// 310 = 300 câu chung + 10 câu của bang mình (mỗi người chỉ học bộ của bang đang sống)
export const metadata: Metadata = quizPageMeta({
  path: "/leben-in-deutschland",
  title: `Leben in Deutschland: ${generalCount() + stateIds(STATES[0].code).length} câu hỏi thi + dịch tiếng Việt`,
  description: `Ôn thi Leben in Deutschland / Einbürgerungstest bằng tiếng Việt: ${generalCount()} câu chung + 10 câu riêng của ${STATES.length} bang (danh mục BAMF 2025), thi thử ${EXAM_TOTAL} câu ${EXAM.minutes} phút.`,
});

// Câu hỏi thường gặp: hiện trên trang + dữ liệu có cấu trúc FAQPage (nội dung hai nơi phải giống nhau)
const FAQ = [
  {
    q: "Bài thi Leben in Deutschland có bao nhiêu câu?",
    a: `${EXAM_TOTAL} câu trắc nghiệm, làm trong ${EXAM.minutes} phút: ${EXAM.general} câu lấy từ 300 câu chung và ${EXAM.state} câu riêng của bang bạn đang sống. Mỗi câu có 4 phương án, chỉ 1 phương án đúng.`,
  },
  {
    q: "Cần đúng bao nhiêu câu để đậu?",
    a: `Cần đúng ít nhất ${EXAM.pass}/${EXAM_TOTAL} câu — đây là mức cần cho nhập tịch (Einbürgerung). Khi thi trong khoá định hướng (Orientierungskurs) của khoá hội nhập, đúng 15 câu là qua khoá học, nhưng vẫn phải đủ ${EXAM.pass} câu mới được tính là đạt chứng nhận „Leben in Deutschland".`,
  },
  {
    q: "Câu hỏi trên trang lấy từ đâu?",
    a: "Từ danh mục câu hỏi chính thức của BAMF (Gesamtfragenkatalog, bản ngày 07.05.2025): 300 câu chung và 10 câu cho mỗi bang trong 16 bang. Số câu trên trang trùng với số câu (Aufgabe) trong danh mục.",
  },
  {
    q: "Có bản dịch tiếng Việt không?",
    a: "Có — mỗi câu hỏi và mỗi phương án đều có bản dịch tiếng Việt, bật / tắt bằng nút „Bản dịch\". Khi thi thật đề chỉ có tiếng Đức, nên màn thi thử cũng ẩn bản dịch.",
  },
  {
    q: "Đăng ký thi thật ở đâu?",
    a: "Tại các cơ sở được BAMF cho phép tổ chức thi, thường là trường dạy tiếng hoặc Volkshochschule gần nơi bạn ở. Lệ phí bài thi Einbürgerungstest là 25 €.",
  },
];

async function Home() {
  const { state, chosen } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "lid") : {};
  const mine = [...generalIds(), ...stateIds(state.code)];
  const inScope = new Set(mine);
  const all = summarize(mine, stats);
  const marked = user ? quizBookmarks(user.id, "lid").filter((id) => inScope.has(id)).length : 0;

  return (
    <>
      {/* Đầu trang: bìa vở coral + nhãn — tiến trình nằm ngay trong nhãn (cùng khuôn với Lái xe) */}
      <PageHeader
        sec="lid"
        icon={Landmark}
        mascot
        title="Leben in Deutschland"
        sub={`Ôn thi nhập tịch bang ${state.name} · Einbürgerungstest · danh mục BAMF 2025`}
        meta={
          <span className="flex items-center gap-2 rounded-md bg-white/85 py-1 pr-2.5 pl-1.5 text-[#16203a] max-sm:hidden">
            <Wappen code={state.code} className="h-6 w-5" />
            {state.name}
          </span>
        }
        actions={
          <Link href="/leben-in-deutschland/cai-dat" className="btn btn-sm">
            <Settings className="size-4" /> Cài đặt
          </Link>
        }
      >
        <QuizProgress {...all} />
      </PageHeader>

      {/* Chưa tự chọn bang → nhắc chọn; đã chọn thì đổi bang trong Cài đặt (như đổi hạng ở Lái xe) */}
      {!chosen && <StatePicker states={STATES} current={state.code} chosen={false} />}

      {!user && (
        <p className="alert alert-info">
          <span>
            <Link href={`/login?next=${encodeURIComponent("/leben-in-deutschland")}`} className="font-bold underline underline-offset-2">
              Đăng nhập
            </Link>{" "}
            để lưu tiến trình, câu sai và lịch sử thi.
          </span>
        </p>
      )}

      {/* 2 cuốn vở lớn: Học / Thi thử (cuốn chính) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <BigCard href="/leben-in-deutschland/chu-de" icon={BookOpen} title="Học theo chủ đề" text={`${generalCount()} câu chung + ${stateIds(state.code).length} câu bang`} cta="Học" />
        <BigCard href="/leben-in-deutschland/thi-thu" icon={Flag} title="Thi thử" text={`${EXAM_TOTAL} câu · ${EXAM.minutes} phút`} cta="Vào thi" primary />
      </div>

      {/* Menu phụ — cùng 3 mục, cùng thứ tự với Lái xe */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/leben-in-deutschland/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          locked={!user}
          disabled={!!user && !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
        <ActionCard
          href="/leben-in-deutschland/danh-dau"
          icon={Star}
          title="Đánh dấu"
          locked={!user}
          disabled={!!user && !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ngôi sao ở câu hỏi để đánh dấu"}
        />
        <ActionCard href="/leben-in-deutschland/thong-ke" icon={BarChart3} title="Thống kê" locked={!user} text={user ? "Kết quả và tiến trình" : "Đăng nhập để xem thống kê"} />
      </div>

      {/* Câu hỏi thường gặp: nội dung cho SEO (FAQPage), xếp sau menu như phần phụ */}
      <section className="card flex flex-col gap-1 sm:p-6" aria-labelledby="lid-faq">
        <h2 id="lid-faq" className="section-title mb-1">
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
    <main className="page" data-sec="lid">
      <JsonLd data={[faqLd(FAQ), breadcrumbLd([["Leben in Deutschland", "/leben-in-deutschland"]])]} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </main>
  );
}
