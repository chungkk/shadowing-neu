import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, ChevronDown, Clock } from "lucide-react";
import {
  ChristmasBookIcon as BookOpen,
  ChristmasChartIcon as BarChart3,
  ChristmasFlagIcon as Flag,
  ChristmasLidIcon as Landmark,
  ChristmasSettingsIcon as Settings,
  ChristmasStarIcon as Star,
  ChristmasWrongIcon as RotateCcw,
} from "@/components/FestiveIcons";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { EXAM, EXAM_TOTAL, STATES, generalCount, generalIds, prefs, stateIds } from "@/lib/lid";
import { JsonLd, breadcrumbLd, faqLd, quizPageMeta } from "@/lib/laixe/seo";
import { summarize } from "@/lib/quiz/types";
import { ActionCard, BigCard, ProgressBar, QuizProgress } from "@/components/quiz/QuizParts";
import PageHeader from "@/components/PageHeader";
import { StatePicker } from "@/components/lid/StatePicker";
import { Wappen } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = quizPageMeta({
  path: "/leben-in-deutschland",
  title: `Leben in Deutschland: ${generalCount() + stateIds(STATES[0].code).length} câu hỏi thi + dịch tiếng Việt`,
  description: `Ôn thi Leben in Deutschland / Einbürgerungstest bằng tiếng Việt: ${generalCount()} câu chung + 10 câu riêng của ${STATES.length} bang (danh mục BAMF 2025), thi thử ${EXAM_TOTAL} câu ${EXAM.minutes} phút.`,
});

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
  const gen = generalIds();
  const st = stateIds(state.code);
  const mine = [...gen, ...st];
  const inScope = new Set(mine);
  const all = summarize(mine, stats);
  const genStat = summarize(gen, stats);
  const stStat = summarize(st, stats);
  const marked = user ? quizBookmarks(user.id, "lid").filter((id) => inScope.has(id)).length : 0;

  return (
    <>
      <PageHeader
        sec="lid"
        icon={Landmark}
        mascot
        title="Leben in Deutschland"
        sub={`Ôn thi nhập tịch & hội nhập (Einbürgerungstest) · danh mục BAMF 2025 · bang ${state.name}`}
        meta={
          <span className="badge badge-coral gap-1.5">
            <Wappen code={state.code} className="h-4 w-3.5" />
            {state.name}
          </span>
        }
        actions={
          <Link href="/leben-in-deutschland/cai-dat" className="btn btn-sm">
            <Settings className="size-3.5" /> Đổi bang / Cài đặt
          </Link>
        }
      />

      {!chosen && <StatePicker states={STATES} current={state.code} chosen={false} />}

      {!user && (
        <p className="alert alert-info">
          <span>
            <Link href={`/login?next=${encodeURIComponent("/leben-in-deutschland")}`} className="font-semibold underline underline-offset-2">
              Đăng nhập
            </Link>{" "}
            để lưu tiến độ, gom câu hay sai và làm đề thi thử 33 câu có chấm điểm.
          </span>
        </p>
      )}

      {/* Khối đặc thù của LiD: Bang đang chọn (Wappen) + tách rõ 300 câu chung / 10 câu riêng của bang */}
      <section className="card grid gap-5 p-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-center" aria-label="Tổng quan bộ câu hỏi theo bang">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
            <span className="badge badge-coral">BAMF 2025</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CheckCircle2 className="size-3.5 text-ok-text" aria-hidden /> Đậu từ {EXAM.pass}/{EXAM_TOTAL} câu
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="size-3.5" aria-hidden /> {EXAM.minutes} phút
            </span>
          </div>

          <QuizProgress {...all} />

          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">300 câu chung toàn liên bang</span>
              <span className="font-mono text-muted tabular-nums">
                {genStat.done}/{genStat.total}
              </span>
            </div>
            <ProgressBar {...genStat} />
          </div>
        </div>

        {/* Thẻ riêng của Bang (đặc trưng của Leben in Deutschland) */}
        <div className="surface flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card p-1.5">
              <Wappen code={state.code} className="h-8 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted">10 câu riêng của bang</p>
              <p className="truncate text-sm font-bold text-foreground">{state.name}</p>
            </div>
            <span className="font-mono text-xs font-semibold text-muted tabular-nums">
              {stStat.done}/{stStat.total}
            </span>
          </div>
          <ProgressBar {...stStat} />
          <Link href={`/leben-in-deutschland/${state.code}`} prefetch={false} className="btn btn-sm w-full">
            Luyện 10 câu bang {state.name} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* 2 lối vào chính */}
      <div className="grid gap-4 sm:grid-cols-2">
        <BigCard
          href="/leben-in-deutschland/chu-de"
          icon={BookOpen}
          title="Học theo chủ đề & bộ 30 câu"
          text={`${generalCount()} câu chung chia theo chủ đề BAMF & bộ 30 câu, kèm 10 câu của bang ${state.name}.`}
          badge="310 câu"
          cta="Chọn bộ câu hỏi"
        />
        <BigCard
          href="/leben-in-deutschland/thi-thu"
          icon={Flag}
          title="Thi thử Einbürgerungstest"
          text={`${EXAM_TOTAL} câu (${EXAM.general} chung + ${EXAM.state} bang ${state.name}), đề tiếng Đức thuần, đạt ≥ ${EXAM.pass} câu đậu.`}
          badge={`${EXAM_TOTAL} câu · ${EXAM.minutes}p`}
          cta="Vào thi thử"
          primary
        />
      </div>

      {/* Công cụ ôn tập phụ */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/leben-in-deutschland/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          locked={!user}
          disabled={!!user && !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu cần làm lại` : "Chưa có câu sai nào"}
        />
        <ActionCard
          href="/leben-in-deutschland/danh-dau"
          icon={Star}
          title="Câu đánh dấu"
          locked={!user}
          disabled={!!user && !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu đã lưu` : "Bấm ngôi sao ở câu hỏi để lưu"}
        />
        <ActionCard href="/leben-in-deutschland/thong-ke" icon={BarChart3} title="Thống kê & lịch sử" locked={!user} text={user ? "Biểu đồ & 10 bài thi gần nhất" : "Đăng nhập để xem thống kê"} />
      </div>

      {/* FAQPage */}
      <section className="card flex flex-col gap-1 p-5 sm:p-6" aria-labelledby="lid-faq">
        <h2 id="lid-faq" className="section-title mb-1">
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
    <main className="page" data-sec="lid">
      <JsonLd data={[faqLd(FAQ), breadcrumbLd([["Leben in Deutschland", "/leben-in-deutschland"]])]} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </main>
  );
}
