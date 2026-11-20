"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Ear,
  Flame,
  Mic,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Volume2,
  Zap,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  PATH_LEVELS,
  STAGES,
  buildPathPlan,
  inferInitialLevel,
  isPathLevel,
  stageSpec,
  type PathLesson,
  type PathLevel,
  type StageId,
  type WeakWordItem,
} from "@/lib/learning-path";
import { lessonPath } from "@/lib/slug";
import { speakGerman } from "@/lib/speak";
import LevelBadge from "./LevelBadge";

const STAGE_ICON = { 1: Ear, 2: Mic, 3: Zap } as const;
const FIT_BADGE = { ok: "badge-ok", gold: "badge-gold", link: "badge-link" } as const;

export default function LearningPath({
  lessons,
  loggedIn,
  sentencesToday = 0,
  reviewsToday = 0,
  weakWords = [],
}: {
  lessons: PathLesson[];
  loggedIn: boolean;
  sentencesToday?: number;
  reviewsToday?: number;
  weakWords?: WeakWordItem[];
}) {
  const defaultLevel = useMemo(() => inferInitialLevel(lessons), [lessons]);
  const [storedLevel, setStoredLevel] = useLocalStorage<string>("learning-path-level", "");
  const level: PathLevel = isPathLevel(storedLevel) ? storedLevel : defaultLevel;
  const [pickedStage, setPickedStage] = useState<StageId | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const plan = useMemo(() => buildPathPlan(lessons, level, pickedStage ?? undefined), [lessons, level, pickedStage]);
  const activeStage = pickedStage ?? plan.currentStage;
  const spec = stageSpec(activeStage);
  const todayPct = Math.min(100, Math.round((sentencesToday * 100) / plan.track.dailyGoal));

  const speak = (word: string) => {
    setSpeaking(word);
    void speakGerman(word, { onEnd: () => setSpeaking((s) => (s === word ? null : s)) });
  };

  if (!lessons.length) return null;

  return (
    <section aria-labelledby="learning-path-title" data-sec="de" className="card flex flex-col gap-5 p-4 sm:p-6">
      {/* Đầu mục: tiêu đề + mục tiêu lộ trình + chọn trình độ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="icon-bubble tint-sec size-10 shrink-0 rounded-xl">
            <Compass className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="learning-path-title" className="section-title">
                Lộ trình học tiếng Đức
              </h2>
              <span className="badge badge-accent font-display font-extrabold">
                {plan.track.from} → {plan.track.to}
              </span>
            </div>
            <p className="text-sm text-muted">Biết rõ hôm nay học bài nào, bao nhiêu câu và khi nào nên tăng độ khó.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn trình độ hiện tại">
          <span className="mr-1 text-xs font-semibold text-muted">Trình độ của bạn:</span>
          {PATH_LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              aria-pressed={level === lv}
              onClick={() => {
                setStoredLevel(lv);
                setPickedStage(null);
              }}
              className="chip"
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Giai đoạn học: Nghe hiểu → Shadowing → Phản xạ */}
      <div className="grid gap-3 md:grid-cols-3">
        {STAGES.map((st) => {
          const Icon = STAGE_ICON[st.id];
          const prog = plan.stageProgress[st.id];
          const selected = activeStage === st.id;
          const isCurrent = plan.currentStage === st.id;
          const done = loggedIn && prog.pct >= 100;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => setPickedStage(st.id)}
              aria-pressed={selected}
              className={`tile flex cursor-pointer flex-col gap-2.5 p-3.5 text-left transition ${
                selected ? "border-accent bg-accent-soft/40 shadow-[inset_0_0_0_1px_var(--accent)]" : "hover:border-line-strong"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`icon-bubble size-8 rounded-lg ${done ? "tint-ok" : selected ? "tint-accent" : "tint-muted"}`}>
                  {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                </span>
                <div className="flex items-center gap-1.5">
                  {isCurrent && <span className="badge badge-gold">Đề xuất</span>}
                  <span className="badge badge-muted">{st.timeframe}</span>
                </div>
              </div>
              <div>
                <p className="font-display text-[15px] leading-snug font-extrabold tracking-[-0.01em]">{st.name}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{st.summary}</p>
              </div>
              {loggedIn && (
                <div className="mt-auto flex flex-col gap-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted tabular-nums">
                    <span>
                      {st.id === 3 ? `${prog.done}/${prog.goal} bài ${level}` : `${prog.done}/${prog.goal} câu`}
                    </span>
                    <span className={done ? "text-ok-text" : undefined}>{prog.pct}%</span>
                  </div>
                  <div className="progress h-1.5">
                    <div className="progress-bar" style={{ width: `${prog.pct}%` }} />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Kế hoạch hôm nay: 2 cột — Bài đề xuất hôm nay & Mục tiêu / Điều kiện lên cấp */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Cột 1: Hôm nay nên học bài nào + mức độ phù hợp */}
        <div className="surface flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="label flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber" /> Hôm nay nên học bài nào?
            </span>
            {plan.fit && <span className={`badge ${FIT_BADGE[plan.fit.tone]}`}>{plan.fit.label}</span>}
          </div>

          {plan.recommended ? (
            <>
              <div className="flex items-start gap-3">
                <Link
                  href={`${lessonPath(plan.recommended.slug)}?stage=${activeStage}`}
                  className="group relative w-28 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-card-2 sm:w-36"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${plan.recommended.videoId}/mqdefault.jpg`}
                    alt=""
                    className="aspect-video w-full object-cover transition group-hover:scale-105"
                  />
                  <LevelBadge level={plan.recommended.level} className="absolute top-1.5 right-1.5" />
                  {plan.recommended.percent > 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                      <div className="progress-bar rounded-none" style={{ width: `${plan.recommended.percent}%` }} />
                    </div>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`${lessonPath(plan.recommended.slug)}?stage=${activeStage}`}
                    className="line-clamp-2 font-display text-base leading-snug font-extrabold hover:text-accent-text"
                  >
                    {plan.recommended.title}
                  </Link>
                  {plan.fit && <p className="text-xs leading-relaxed text-muted">{plan.fit.reason}</p>}
                  <p className="text-xs font-medium text-foreground/80">
                    Chế độ gợi ý: <b>{spec.name}</b>
                  </p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href={`${lessonPath(plan.recommended.slug)}?stage=${activeStage}`}
                  className="btn btn-primary max-sm:w-full"
                >
                  <Play className="size-4 fill-current" /> {spec.ctaLabel}
                </Link>
                <Link href={`/tieng-duc/trinh-do/${level.toLowerCase()}`} className="btn btn-ghost btn-sm text-muted hover:text-foreground">
                  Xem tất cả bài {level} <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Chọn một bài học trong thư viện bên dưới để bắt đầu lộ trình.</p>
          )}
        </div>

        {/* Cột 2: Mục tiêu mỗi ngày + Khi nào nên chuyển sang bài khó hơn */}
        <div className="surface flex flex-col gap-3.5 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="label flex items-center gap-1.5">
                <Target className="size-3.5 text-accent-text" /> Mục tiêu mỗi ngày
              </span>
              <span className="text-xs font-extrabold tabular-nums">
                {loggedIn ? `${sentencesToday}/${plan.track.dailyGoal} câu` : `${plan.track.dailyGoal} câu / ngày`}
              </span>
            </div>
            <p className="text-xs text-muted">
              Mỗi ngày luyện <b>{plan.track.dailyGoal} {spec.dailyAction}</b>
              {loggedIn && reviewsToday > 0 ? ` · đã ôn ${reviewsToday} lượt từ vựng hôm nay.` : " + ôn 10–15 từ đến hạn trong sổ."}
            </p>
            {loggedIn && (
              <div className="progress h-2">
                <div className="progress-bar" style={{ width: `${todayPct}%` }} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <span className="label flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-ok-text" /> Khi nào lên {plan.track.to}?
            </span>
            {plan.advanceReady ? (
              <div className="flex flex-col gap-2 rounded-lg bg-ok-soft/60 p-2.5 text-xs">
                <p className="font-bold text-ok-text">
                  Bạn đã đạt mốc luyện tập của {plan.track.from}! Có thể chuyển sang các bài {plan.track.to} khó hơn.
                </p>
                {isPathLevel(plan.track.to) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStoredLevel(plan.track.to);
                      setPickedStage(1);
                    }}
                    className="btn btn-sm btn-primary self-start"
                  >
                    Chuyển sang lộ trình {plan.track.to} <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`size-3.5 shrink-0 ${plan.stageProgress[1].pct >= 100 ? "text-ok-text" : "opacity-40"}`} />
                  <span>
                    Nghe hiểu (Dictation {level}): <b className="text-foreground tabular-nums">{plan.stageProgress[1].done}/{plan.stageProgress[1].goal} câu</b>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`size-3.5 shrink-0 ${plan.stageProgress[2].pct >= 100 ? "text-ok-text" : "opacity-40"}`} />
                  <span>
                    Shadowing {level}: <b className="text-foreground tabular-nums">{plan.stageProgress[2].done}/{plan.stageProgress[2].goal} câu</b>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`size-3.5 shrink-0 ${plan.stageProgress[3].pct >= 100 ? "text-ok-text" : "opacity-40"}`} />
                  <span>
                    Hoàn thành ≥80% ít nhất <b className="text-foreground tabular-nums">{plan.stageProgress[3].done}/{plan.stageProgress[3].goal} bài {level}</b>
                  </span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Từ hay nghe không hiểu (lấy từ lịch sử bấm tra & quên trong video) */}
      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label flex items-center gap-1.5">
            <Flame className="size-3.5 text-amber" /> Từ bạn hay nghe không rõ trong bài
          </span>
          {loggedIn && weakWords.length > 0 && (
            <Link href="/vocab/notebook?review=1" className="inline-flex items-center gap-1 text-xs font-bold text-link hover:underline">
              Ôn ngay trong Sổ từ vựng <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
        {loggedIn && weakWords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {weakWords.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => speak(w.word)}
                title={`${w.meaning || "Bấm để nghe phát âm"}${w.context ? ` — “${w.context}”` : ""}`}
                className={`surface press inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-left text-xs transition ${
                  speaking === w.word ? "border-accent bg-accent-soft" : "hover:border-line-strong"
                }`}
              >
                <Volume2 className="size-3.5 shrink-0 text-accent-text" />
                <b className="text-sm font-bold text-foreground">{w.word}</b>
                {w.meaning && <span className="max-w-36 truncate text-muted">· {w.meaning}</span>}
                {w.lapses > 0 && <span className="badge badge-coral px-1.5 py-0 text-[10px]">×{w.lapses}</span>}
                {!w.lapses && w.exampleCount > 0 && <span className="badge badge-gold px-1.5 py-0 text-[10px]">{w.exampleCount + 1} bài</span>}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">
            Khi luyện bài, hễ gặp từ nghe không rõ hãy bấm vào từ đó — hệ thống sẽ tự lưu và gom những từ bạn hay vấp lại đây để ôn tập trung.
          </p>
        )}
      </div>
    </section>
  );
}
