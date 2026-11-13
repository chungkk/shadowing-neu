import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties, ComponentType } from "react";
import { BarChart3, BookOpen, Bookmark, ChevronRight, FileText, GraduationCap, RotateCcw, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { CATEGORIES, EXAM, EXAM_TOTAL, STATES, generalCount, generalIds, prefs, stateIds } from "@/lib/lid";
import { summarize } from "@/lib/quiz-types";
import { ProgressBar } from "@/components/QuizParts";
import { LidInfo, LidShell } from "@/components/lid/LidParts";
import { StatePicker } from "@/components/lid/StatePicker";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Leben in Deutschland",
  description: "Luyện thi Leben in Deutschland / Einbürgerungstest: 300 câu chung + câu riêng của 16 bang, có bản dịch tiếng Việt, đánh dấu câu, lịch sử thi và thi thử 33 câu.",
};

/** Thẻ vuông màu tối có vạch màu trên đầu — 4 thẻ của màn chính app */
function MenuCard({ href, icon: Icon, title, text, bg, accent }: { href: string; icon: ComponentType<{ className?: string; style?: CSSProperties }>; title: string; text: string; bg: string; accent: string }) {
  return (
    <Link
      href={href}
      style={{ backgroundColor: bg }}
      className="relative flex aspect-square flex-col overflow-hidden rounded-[18px] p-[18px] shadow-[0_8px_14px_rgba(0,0,0,0.45)] transition hover:brightness-125 active:scale-[0.96]"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] opacity-90" style={{ backgroundColor: accent }} />
      <span className="flex size-[46px] items-center justify-center rounded-[13px] sm:size-14" style={{ backgroundColor: `${accent}33` }}>
        <Icon className="size-[26px] sm:size-8" style={{ color: accent }} />
      </span>
      <span className="mt-auto text-base font-bold tracking-tight sm:text-lg">{title}</span>
      <span className="mt-0.5 text-xs text-white/50 sm:text-sm">{text}</span>
    </Link>
  );
}

/** Dòng phụ (chỉ có trên web): Thống kê, Ôn câu sai… */
function Row({ href, icon: Icon, title, text, disabled }: { href: string; icon: ComponentType<{ className?: string }>; title: string; text: string; disabled?: boolean }) {
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-[#a0a0c0]">
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-white/45">{text}</span>
      </span>
      {!disabled && <ChevronRight className="size-4 shrink-0 text-white/35" />}
    </>
  );
  const cls = "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3";
  if (disabled) return <div className={`${cls} opacity-50`}>{body}</div>;
  return (
    <Link href={href} className={`${cls} transition hover:bg-white/[0.08]`}>
      {body}
    </Link>
  );
}

async function Home() {
  const { state } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "lid") : {};
  const mine = [...generalIds(), ...stateIds(state.code)];
  const inScope = new Set(mine);
  const all = summarize(mine, stats);
  const marked = user ? quizBookmarks(user.id, "lid").filter((id) => inScope.has(id)).length : 0;

  return (
    <>
      {/* Đầu trang: logo + tên app + vạch cờ Đức */}
      <header className="mt-2 mb-4 flex flex-col items-center text-center">
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="flex size-[42px] items-center justify-center rounded-xl bg-[#003399] shadow-[0_6px_12px_rgba(0,51,153,0.6)]">
            <GraduationCap className="size-[22px] text-[#ffcc00]" />
          </span>
          <h1 className="text-[30px] font-extrabold tracking-tight">
            LiD <span className="text-[#ffcc00]">Ckk</span>
          </h1>
        </div>
        <p className="mt-1 text-[13px] text-white/40">Leben in Deutschland · Ôn thi nhập tịch Đức</p>
        <div className="mt-3.5 flex h-[3px] w-[72px] overflow-hidden rounded-sm opacity-75" aria-hidden>
          <span className="flex-1 bg-[#222]" />
          <span className="flex-1 bg-[#cc0000]" />
          <span className="flex-1 bg-[#ffcc00]" />
        </div>
      </header>

      <StatePicker states={STATES} current={state.code} />

      <div className="grid grid-cols-2 gap-3">
        <MenuCard href="/leben-in-deutschland/hoc" icon={BookOpen} title="Học" text={`${mine.length} câu hỏi`} bg="#0A1F5C" accent="#4D8BFF" />
        <MenuCard href="/leben-in-deutschland/thi-thu" icon={FileText} title="Thi thử" text={`${EXAM_TOTAL} câu`} bg="#3D0010" accent="#FF4060" />
        <MenuCard href={user ? "/leben-in-deutschland/danh-dau" : "/login?next=/leben-in-deutschland/danh-dau"} icon={Bookmark} title="Đánh dấu" text={user ? `${marked} câu` : "Đăng nhập để lưu"} bg="#3D2400" accent="#FFAA00" />
        <MenuCard href="/leben-in-deutschland/cai-dat" icon={Settings} title="Cài đặt" text="Ngôn ngữ, Dữ liệu" bg="#1C1C28" accent="#A0A0C0" />
      </div>

      <LidInfo>Cần đạt ít nhất {EXAM.pass}/{EXAM_TOTAL} câu đúng để đậu bài thi.</LidInfo>

      {/* Phần thêm của web: tiến độ, thống kê, ôn câu sai, học theo chủ đề */}
      {user ? (
        <section className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[11px] font-semibold tracking-[0.1em] text-white/35">TIẾN ĐỘ</span>
            <span className="text-white/50 tabular-nums">
              <b className="text-white">{all.done}</b> / {all.total}
            </span>
          </div>
          <ProgressBar {...all} />
          <div className="flex gap-4 text-sm text-white/50">
            <span>
              <span className="text-[#10b981]">●</span> Đúng <b className="text-white tabular-nums">{all.ok}</b>
            </span>
            <span>
              <span className="text-[#ef4444]">●</span> Sai <b className="text-white tabular-nums">{all.wrong}</b>
            </span>
          </div>
        </section>
      ) : (
        <p className="text-center text-sm text-white/45">
          <Link href="/login?next=/leben-in-deutschland" className="font-bold text-white underline underline-offset-2">
            Đăng nhập
          </Link>{" "}
          để lưu tiến độ, câu đánh dấu và lịch sử thi.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Row href="/leben-in-deutschland/thong-ke" icon={BarChart3} title="Thống kê" text={user ? "Tiến độ và lịch sử thi" : "Đăng nhập để xem thống kê"} disabled={!user} />
        <Row
          href="/leben-in-deutschland/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
          disabled={!user || !all.wrong}
        />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="mt-2 text-[11px] font-semibold tracking-[0.1em] text-white/35">HỌC THEO CHỦ ĐỀ</h2>
        {CATEGORIES.map((c) => (
          <Row key={c.key} href={`/leben-in-deutschland/${c.key}`} icon={BookOpen} title={c.vi} text={`${c.de} · câu ${c.from}–${c.to}`} />
        ))}
        <Row href={`/leben-in-deutschland/${state.code}`} icon={BookOpen} title={`Câu riêng của ${state.name}`} text={`${stateIds(state.code).length} câu · câu 301–310`} />
        <Row href="/leben-in-deutschland/tat-ca?mode=lesen" icon={BookOpen} title="Đọc lướt đáp án" text={`${generalCount()} câu chung, đáp án đúng có sẵn`} />
      </section>
    </>
  );
}

export default function Page() {
  return (
    <LidShell glow>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </LidShell>
  );
}
