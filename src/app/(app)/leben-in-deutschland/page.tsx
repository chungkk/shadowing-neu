import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, Flag, RotateCcw, Settings, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { EXAM, EXAM_TOTAL, STATES, generalCount, generalIds, prefs, stateIds } from "@/lib/lid";
import { SITE_URL } from "@/lib/site";
import { summarize } from "@/lib/quiz/types";
import { ActionCard, BigCard, ProgressBar } from "@/components/quiz/QuizParts";
import { StatePicker } from "@/components/lid/StatePicker";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Leben in Deutschland tiếng Việt – Luyện thi Einbürgerungstest",
  description:
    "Ôn thi Leben in Deutschland / Einbürgerungstest bằng tiếng Việt: đủ 300 câu chung + 10 câu của 16 bang theo danh mục BAMF 2025, bản dịch từng câu, thi thử 33 câu 60 phút như thật.",
  alternates: { canonical: "/leben-in-deutschland" },
  openGraph: { url: "/leben-in-deutschland", type: "website" },
};

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

function jsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Leben in Deutschland", item: `${SITE_URL}/leben-in-deutschland` },
      ],
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

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
      {/* Đầu trang: tiêu đề + phụ đề + nút cài đặt — cùng khuôn với Lái xe */}
      <section className="sticker p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="page-title">Leben in Deutschland</h1>
            <p className="text-sm text-muted">Ôn thi nhập tịch bang {state.name} · Einbürgerungstest</p>
          </div>
          <Link href="/leben-in-deutschland/cai-dat" className="btn-icon" aria-label="Cài đặt Leben in Deutschland">
            <Settings className="size-5" />
          </Link>
        </div>
      </section>

      {/* Chưa tự chọn bang → nhắc chọn; đã chọn thì đổi bang trong Cài đặt (như đổi hạng ở Lái xe) */}
      {!chosen && <StatePicker states={STATES} current={state.code} chosen={false} />}

      {/* Tiến trình */}
      <section className="sticker flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold tracking-wider text-muted uppercase">Tiến trình</h2>
          <span className="rounded-full bg-card-2 px-2.5 py-1 text-xs font-bold text-muted">Danh mục BAMF 2025</span>
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
            <Link href={`/login?next=${encodeURIComponent("/leben-in-deutschland")}`} className="font-bold underline underline-offset-2">
              Đăng nhập
            </Link>{" "}
            để lưu tiến trình, câu sai và lịch sử thi.
          </p>
        )}
      </section>

      {/* 2 thẻ lớn: Học / Thi thử (thẻ chính) */}
      <div className="grid grid-cols-2 gap-3">
        <BigCard href="/leben-in-deutschland/chu-de" icon={BookOpen} title="Học theo chủ đề" text={`${generalCount()} câu chung + ${stateIds(state.code).length} câu bang`} />
        <BigCard href="/leben-in-deutschland/thi-thu" icon={Flag} title="Thi thử" text={`${EXAM_TOTAL} câu · ${EXAM.minutes} phút`} primary />
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
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ⭐ ở câu hỏi để đánh dấu"}
        />
        <ActionCard href="/leben-in-deutschland/thong-ke" icon={BarChart3} title="Thống kê" locked={!user} text={user ? "Kết quả và tiến trình" : "Đăng nhập để xem thống kê"} />
      </div>

      {/* Câu hỏi thường gặp: nội dung cho SEO (FAQPage), xếp sau menu như phần phụ */}
      <section className="card flex flex-col gap-2" aria-labelledby="lid-faq">
        <h2 id="lid-faq" className="section-title">
          Câu hỏi thường gặp
        </h2>
        {FAQ.map((f) => (
          <details key={f.q} className="group rounded-2xl border-2 border-ink/15 px-3 py-2">
            <summary className="cursor-pointer font-bold">{f.q}</summary>
            <p className="mt-1 text-sm text-muted">{f.a}</p>
          </details>
        ))}
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main className="page">
      {jsonLd()}
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </main>
  );
}
