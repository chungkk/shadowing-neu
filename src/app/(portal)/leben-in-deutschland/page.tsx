import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, Bookmark, Eye, Flag, RotateCcw, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { CATEGORIES, EXAM, EXAM_TOTAL, STATES, generalCount, generalIds, getSet, hasTopics, listSets, prefs, stateIds } from "@/lib/lid";
import { SITE_URL } from "@/lib/site";
import { summarize } from "@/lib/quiz-types";
import type { QuizStat } from "@/lib/quiz-types";
import { ActionCard, BigCard, ProgressBar } from "@/components/QuizParts";
import { LidInfo, Wappen } from "@/components/lid/LidParts";
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

/** Ô của 1 bộ câu: tên + tiến độ đúng / đã làm */
function SetTile({ href, title, sub, ids, stats, icon }: { href: string; title: string; sub?: string; ids: string[]; stats: Record<string, QuizStat>; icon?: ReactNode }) {
  const s = summarize(ids, stats);
  return (
    <Link href={href} prefetch={false} className="card sticker-link flex flex-col gap-2 p-3">
      <span className="flex items-center gap-2">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold">{title}</span>
          {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
        </span>
        <span className="shrink-0 text-xs font-bold text-muted tabular-nums">
          {s.done}/{s.total}
        </span>
      </span>
      <ProgressBar {...s} />
    </Link>
  );
}

async function Home() {
  const { state, chosen } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "lid") : {};
  const mine = [...generalIds(), ...stateIds(state.code)];
  const inScope = new Set(mine);
  const all = summarize(mine, stats);
  const marked = user ? quizBookmarks(user.id, "lid").filter((id) => inScope.has(id)).length : 0;
  const own = getSet(state.code)!;

  return (
    <>
      {/* Đầu trang: tiêu đề + nút cài đặt — như Lái xe */}
      <section className="card">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="page-title">Leben in Deutschland</h1>
            <p className="text-sm text-muted">Ôn thi nhập tịch Đức (Einbürgerungstest) bằng tiếng Việt · danh mục BAMF 2025</p>
          </div>
          <Link href="/leben-in-deutschland/cai-dat" className="btn-icon" aria-label="Cài đặt Leben in Deutschland">
            <Settings className="size-5" />
          </Link>
        </div>
      </section>

      <StatePicker states={STATES} current={state.code} chosen={chosen} />

      {/* Tiến trình */}
      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold tracking-wider text-muted uppercase">Tiến trình</h2>
          <span className="rounded-full bg-card-2 px-2.5 py-1 text-xs font-bold text-muted">
            {generalCount()} câu chung + {stateIds(state.code).length} câu bang
          </span>
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
            để lưu tiến trình, câu đánh dấu và lịch sử thi.
          </p>
        )}
      </section>

      {/* 2 thẻ lớn: Học / Thi thử (thẻ chính). Cài đặt nằm ở nút bánh răng trên đầu trang */}
      <div className="grid grid-cols-2 gap-3">
        <BigCard href="/leben-in-deutschland/hoc" icon={BookOpen} title="Học tất cả" text={`${mine.length} câu hỏi`} />
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
        <ActionCard href="/leben-in-deutschland/danh-dau" icon={Bookmark} title="Đánh dấu" locked={!user} text={user ? `${marked} câu` : "Đăng nhập để đánh dấu câu"} />
        <ActionCard href="/leben-in-deutschland/thong-ke" icon={BarChart3} title="Thống kê" locked={!user} text={user ? "Tiến độ và lịch sử thi" : "Đăng nhập để xem thống kê"} />
      </div>

      {/* Học từng phần: câu của bang, bộ 30 câu, chủ đề, đọc lướt */}
      <section className="flex flex-col gap-3" aria-labelledby="lid-parts">
        <h2 id="lid-parts" className="section-title">
          Học từng phần
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <SetTile href={`/leben-in-deutschland/${state.code}`} title={own.title} sub={own.subtitle} ids={own.ids} stats={stats} icon={<Wappen code={state.code} className="h-8 w-6" />} />
          <Link href="/leben-in-deutschland/tat-ca?mode=lesen" prefetch={false} className="card sticker-link flex items-center gap-3 p-3">
            <Eye className="size-6 shrink-0 text-accent-text" />
            <span className="min-w-0">
              <span className="block font-extrabold">Đọc lướt đáp án</span>
              <span className="block text-xs text-muted">300 câu chung, đáp án đúng tô sẵn — ôn nhanh trước khi thi</span>
            </span>
          </Link>
        </div>
        {hasTopics() && (
          <>
            <h3 className="text-xs font-extrabold tracking-wider text-muted uppercase">Theo chủ đề</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {CATEGORIES.map((c) => {
                const s = getSet(c.key)!;
                return <SetTile key={c.key} href={`/leben-in-deutschland/${c.key}`} title={c.vi} sub={c.de} ids={s.ids} stats={stats} />;
              })}
            </div>
          </>
        )}
        <h3 className="text-xs font-extrabold tracking-wider text-muted uppercase">Bộ 30 câu theo số câu BAMF</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {listSets().map((s) => (
            <SetTile key={s.id} href={`/leben-in-deutschland/${s.id}`} title={`Câu ${s.from}–${s.to}`} ids={s.ids} stats={stats} />
          ))}
        </div>
      </section>

      <LidInfo>
        Cần đạt ít nhất {EXAM.pass}/{EXAM_TOTAL} câu đúng để đậu bài thi.
      </LidInfo>

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
