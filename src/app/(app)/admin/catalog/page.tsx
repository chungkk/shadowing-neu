import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  ChristmasCarIcon as Car,
  ChristmasGrammarIcon as GraduationCap,
  ChristmasLidIcon as Landmark,
  ChristmasVocabIcon as BookMarked,
} from "@/components/FestiveIcons";
import { requireAdmin } from "@/lib/auth";
import { adminCatalogStats } from "@/lib/db";
import { listDecks } from "@/lib/decks";
import { ALL_GRAMMAR_SUMMARIES, GRAMMAR_CATEGORIES } from "@/lib/grammar";
import { BOGEN_COUNT, catalogDate, classGroups, forClient as laixeForClient, totalQuestions as laixeTotal } from "@/lib/laixe";
import { CATEGORIES as LID_CATEGORIES, forClient as lidForClient, generalCount as lidGeneralCount, getState, questionLabel, STATES } from "@/lib/lid";
import LevelBadge from "@/components/LevelBadge";
import { ListSkeleton } from "@/components/Skeleton";
import AdminPageHeader from "../_components/AdminPageHeader";
import KpiCard from "../_components/KpiCard";
import SectionCard from "../_components/SectionCard";

const fmt = (n: number) => n.toLocaleString("vi-VN");
const pct = (ok: number, n: number) => (n ? `${Math.round((ok / n) * 100)}%` : "—");

type CatalogTab = "laixe" | "lid" | "decks" | "grammar";

async function CatalogContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab: CatalogTab =
    sp.tab === "lid" || sp.tab === "decks" || sp.tab === "grammar" ? sp.tab : "laixe";

  const stats = adminCatalogStats();
  const decks = listDecks();
  const totalDeckWords = decks.reduce((s, d) => s + d.wordCount, 0);
  const lidTotal = lidGeneralCount() + STATES.length * 10;

  // Lấy nội dung câu sai nhiều nhất cho tab đang mở
  const laixeWrongDetails =
    tab === "laixe" && stats.laixe.topWrong.length
      ? new Map((await laixeForClient(stats.laixe.topWrong.map((w) => w.qid), "vi")).map((q) => [q.id, q]))
      : new Map();
  const lidWrongDetails =
    tab === "lid" && stats.lid.topWrong.length
      ? new Map((await lidForClient(stats.lid.topWrong.map((w) => w.qid), { withAnswers: false })).map((q) => [q.id, q]))
      : new Map();

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Nội dung học tập" }, { label: "Kho nội dung chuẩn" }]}
        title="Kho nội dung chuẩn"
        description="Tổng quan & phân tích dữ liệu học thật cho 4 kho nội dung tĩnh của HalloVN: Lái xe, Leben in Deutschland, Từ vựng và Ngữ pháp."
      />

      {/* 4 KPI đại diện 4 kho */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          href="/admin/catalog?tab=laixe"
          tone="laixe"
          label="Lý thuyết Lái xe"
          icon={<Car className="size-4" aria-hidden />}
          value={laixeTotal()}
          sub={`${BOGEN_COUNT} đề mẫu · ${fmt(stats.laixe.exams)} lượt thi`}
        />
        <KpiCard
          href="/admin/catalog?tab=lid"
          tone="lid"
          label="Leben in DE"
          icon={<Landmark className="size-4" aria-hidden />}
          value={lidTotal}
          sub={`${lidGeneralCount()} chung + ${STATES.length} bang · ${fmt(stats.lid.exams)} lượt thi`}
        />
        <KpiCard
          href="/admin/catalog?tab=decks"
          tone="de"
          label="Bộ từ vựng"
          icon={<BookMarked className="size-4" aria-hidden />}
          value={decks.length}
          sub={`${fmt(totalDeckWords)} mục từ chuẩn`}
        />
        <KpiCard
          href="/admin/catalog?tab=grammar"
          tone="ink"
          label="Ngữ pháp A1–B2"
          icon={<GraduationCap className="size-4" aria-hidden />}
          value={ALL_GRAMMAR_SUMMARIES.length}
          sub={`${GRAMMAR_CATEGORIES.length} chuyên đề chính`}
        />
      </div>

      {/* 4 tab chuyển kho */}
      <div className="tabs-line">
        <Link href="/admin/catalog?tab=laixe" className="tab" aria-current={tab === "laixe" ? "page" : undefined}>
          <Car className="size-4 text-amber" aria-hidden /> Lý thuyết Lái xe
        </Link>
        <Link href="/admin/catalog?tab=lid" className="tab" aria-current={tab === "lid" ? "page" : undefined}>
          <Landmark className="size-4 text-coral-text" aria-hidden /> Leben in DE
        </Link>
        <Link href="/admin/catalog?tab=decks" className="tab" aria-current={tab === "decks" ? "page" : undefined}>
          <BookMarked className="size-4 text-accent-text" aria-hidden /> Bộ từ vựng
        </Link>
        <Link href="/admin/catalog?tab=grammar" className="tab" aria-current={tab === "grammar" ? "page" : undefined}>
          <GraduationCap className="size-4 text-link" aria-hidden /> Ngữ pháp A1–B2
        </Link>
      </div>

      {tab === "laixe" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard tone="laixe" label="Phiên bản bộ đề" value={catalogDate()} sub="src/content/fuehrerschein" />
            <KpiCard tone="ok" label="Tỷ lệ đậu thi thử" value={pct(stats.laixe.passed, stats.laixe.exams)} sub={`${fmt(stats.laixe.passed)}/${fmt(stats.laixe.exams)} đề đậu`} />
            <KpiCard tone="ink" label="Lượt trả lời" value={stats.laixe.answers} sub={`${fmt(stats.laixe.uniqueUsers)} học viên đã luyện`} />
            <KpiCard tone="gem" label="Câu đánh dấu ⭐" value={stats.laixe.bookmarks} sub="Tổng câu học viên lưu lại" />
          </div>

          <SectionCard
            title="Top 10 câu Lái xe hay sai nhất"
            description="Dựa trên dữ liệu quiz_answers thật — hữu ích để rà soát độ rõ của bản dịch tiếng Việt."
            flush
          >
            {stats.laixe.topWrong.length ? (
              <ul className="divide-y divide-line">
                {stats.laixe.topWrong.map((w, idx) => {
                  const q = laixeWrongDetails.get(w.qid);
                  const total = w.wrong + w.correct;
                  return (
                    <li key={w.qid} className="flex flex-wrap items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-red-soft font-mono text-xs font-bold text-red-400 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">{w.qid}</span>
                          {q && <span className="badge badge-gold">{q.points} điểm lỗi</span>}
                        </div>
                        {q && (
                          <>
                            <p className="mt-1 text-sm font-medium text-foreground">{q.q}</p>
                            {q.tr?.q && <p className="mt-0.5 text-xs text-muted">{q.tr.q}</p>}
                          </>
                        )}
                      </div>
                      <div className="shrink-0 text-right font-mono text-xs tabular-nums">
                        <p className="font-bold text-red-400">{fmt(w.wrong)} sai ({pct(w.wrong, total)})</p>
                        <p className="text-muted">{fmt(w.users)} người làm</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted">Chưa có dữ liệu trả lời sai để thống kê.</p>
            )}
          </SectionCard>

          <SectionCard title="Các hạng bằng lái trong hệ thống" description="Cấu hình số câu hỏi & ngưỡng điểm lỗi cho từng hạng.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classGroups().map((g) => (
                <div key={g.title} className="surface flex flex-col gap-2 p-3.5">
                  <p className="text-xs font-bold tracking-wider text-muted uppercase">{g.title}</p>
                  <ul className="divide-y divide-line text-xs">
                    {g.classes.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="font-semibold text-foreground">
                          Hạng {c.id} <span className="font-normal text-muted">· {c.vi || c.name}</span>
                        </span>
                        <span className="shrink-0 font-mono text-muted tabular-nums">{fmt(c.count)} câu</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "lid" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard tone="lid" label="Ngân hàng BAMF" value={lidTotal} sub={`${lidGeneralCount()} câu chung + 10 câu × ${STATES.length} bang`} />
            <KpiCard tone="ok" label="Tỷ lệ đậu thi thử" value={pct(stats.lid.passed, stats.lid.exams)} sub={`${fmt(stats.lid.passed)}/${fmt(stats.lid.exams)} đề đậu (≥17/33)`} />
            <KpiCard tone="ink" label="Lượt trả lời" value={stats.lid.answers} sub={`${fmt(stats.lid.uniqueUsers)} học viên đã luyện`} />
            <KpiCard tone="gem" label="Câu đánh dấu ⭐" value={stats.lid.bookmarks} sub={`${LID_CATEGORIES.length} chủ đề chính`} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SectionCard
              className="xl:col-span-2"
              title="Top 10 câu Leben in Deutschland hay sai nhất"
              description="Theo số lần trả lời sai thực tế của người học."
              flush
            >
              {stats.lid.topWrong.length ? (
                <ul className="divide-y divide-line">
                  {stats.lid.topWrong.map((w, idx) => {
                    const q = lidWrongDetails.get(w.qid);
                    const total = w.wrong + w.correct;
                    return (
                      <li key={w.qid} className="flex flex-wrap items-start gap-3 px-4 py-3">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-red-soft font-mono text-xs font-bold text-red-400 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="badge badge-coral">{questionLabel(w.qid) || w.qid}</span>
                            <span className="font-mono text-xs text-muted">{w.qid}</span>
                          </div>
                          {q && (
                            <>
                              <p className="mt-1 text-sm font-medium text-foreground">{q.q}</p>
                              {q.tr?.q && <p className="mt-0.5 text-xs text-muted">{q.tr.q}</p>}
                            </>
                          )}
                        </div>
                        <div className="shrink-0 text-right font-mono text-xs tabular-nums">
                          <p className="font-bold text-red-400">{fmt(w.wrong)} sai ({pct(w.wrong, total)})</p>
                          <p className="text-muted">{fmt(w.users)} người</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="p-4 text-sm text-muted">Chưa có dữ liệu trả lời sai để thống kê.</p>
              )}
            </SectionCard>

            <SectionCard title="Bang được chọn nhiều nhất" description="Dựa theo cấu hình tài khoản (quiz_prefs).">
              {stats.lid.statePrefs.length ? (
                <ul className="divide-y divide-line text-sm">
                  {stats.lid.statePrefs.map((s) => {
                    const info = getState(s.state);
                    return (
                      <li key={s.state} className="flex items-center justify-between gap-2 py-2">
                        <span className="truncate font-medium text-foreground">{info?.name ?? s.state.toUpperCase()}</span>
                        <span className="font-mono text-xs font-semibold text-sec-text tabular-nums">{fmt(s.count)} người</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">Chưa có người dùng chọn bang riêng.</p>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "decks" && (
        <SectionCard
          title="6 Bộ từ vựng chuẩn (src/content/decks)"
          description="Số lượng mục từ, chủ đề và lượt học thực tế của học viên."
          flush
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-card-2/60 text-xs font-semibold text-muted">
                  <th className="px-4 py-2.5">Bộ từ vựng</th>
                  <th className="px-3 py-2.5">Nhóm</th>
                  <th className="px-3 py-2.5 text-right">Số từ</th>
                  <th className="px-3 py-2.5 text-right">Chủ đề</th>
                  <th className="px-3 py-2.5 text-right">Lượt học</th>
                  <th className="px-4 py-2.5 text-right">Xem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {decks.map((d) => {
                  const st = stats.decks[d.slug];
                  return (
                    <tr key={d.slug} className="transition-colors hover:bg-card-2/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{d.title}</span>
                          {d.level && <LevelBadge level={d.level} className="text-[11px]" />}
                        </div>
                        <p className="font-mono text-xs text-muted">{d.slug}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">{d.category}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">{fmt(d.wordCount)}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-muted tabular-nums">{d.topicCount || "—"}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                        {st ? `${fmt(st.learnedCount)} (${fmt(st.users)} người)` : "0"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/vocab/decks/${d.slug}`} className="btn btn-ghost btn-sm">
                          Mở <ExternalLink className="size-3.5" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === "grammar" && (
        <div className="grid gap-3 md:grid-cols-2">
          {GRAMMAR_CATEGORIES.map((cat) => {
            const lessons = ALL_GRAMMAR_SUMMARIES.filter((l) => l.categoryId === cat.id);
            const totalQuiz = lessons.reduce((s, l) => s + l.quizCount, 0);
            return (
              <SectionCard
                key={cat.id}
                title={`${cat.title} (${cat.germanTitle})`}
                description={`${lessons.length} bài · ${totalQuiz} câu bài tập`}
                flush
              >
                <ul className="divide-y divide-line">
                  {lessons.map((l) => (
                    <li key={l.slug} className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-card-2/40">
                      <LevelBadge level={l.level} className="shrink-0 text-[11px]" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/ngu-phap/${l.slug}`} className="block truncate font-medium text-foreground hover:text-sec-text">
                          {l.title}
                        </Link>
                        <p className="truncate text-xs text-muted">{l.germanTitle}</p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-muted tabular-nums">{l.quizCount} quiz</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function AdminCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CatalogContent searchParams={searchParams} />
    </Suspense>
  );
}
