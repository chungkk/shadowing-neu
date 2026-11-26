"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleCheck,
  Info,
  Lightbulb,
  ListChecks,
  PlayCircle,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import { CaseLegend, GrammarText } from "@/components/grammar/GrammarText";
import {
  stripGrammarMarkup,
  type GrammarBlock,
  type GrammarCategory,
  type GrammarLesson,
} from "@/lib/grammar";
import { useGrammarDone } from "@/lib/grammar-progress";
import { speakGerman, stopSpeaking } from "@/lib/speak";

function ExampleList({
  title,
  items,
  playingKey,
  onSpeak,
  keyPrefix,
}: {
  title?: string;
  items: Extract<GrammarBlock, { type: "examples" }>["items"];
  playingKey: string | null;
  onSpeak: (key: string, text: string, slow?: boolean) => void;
  keyPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {title && <h4 className="text-xs font-bold tracking-wide text-muted uppercase">{title}</h4>}
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
        {items.map((item, idx) => {
          const normalKey = `${keyPrefix}-${idx}-n`;
          const slowKey = `${keyPrefix}-${idx}-s`;
          const isNormalPlaying = playingKey === normalKey;
          const isSlowPlaying = playingKey === slowKey;
          const cleanDe = stripGrammarMarkup(item.de);

          return (
            <div key={idx} className="flex items-start gap-3 p-3.5 sm:px-4">
              <div className="mt-0.5 flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSpeak(normalKey, cleanDe, false)}
                  aria-label={isNormalPlaying ? "Dừng phát âm" : `Nghe câu tiếng Đức: ${cleanDe}`}
                  title="Nghe phát âm tiếng Đức"
                  className={`inline-flex size-9 items-center justify-center rounded-lg border transition-colors ${
                    isNormalPlaying
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-line bg-sidebar text-muted hover:border-line-strong hover:text-foreground"
                  }`}
                >
                  {isNormalPlaying ? (
                    <Square className="size-3.5 fill-current" aria-hidden />
                  ) : (
                    <Volume2 className="size-4" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSpeak(slowKey, cleanDe, true)}
                  aria-label={isSlowPlaying ? "Dừng đọc chậm" : `Nghe chậm: ${cleanDe}`}
                  title="Nghe chậm 0,7×"
                  className={`inline-flex h-9 items-center justify-center rounded-lg border px-2 font-mono text-[11px] font-semibold transition-colors ${
                    isSlowPlaying
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-line bg-sidebar text-muted hover:border-line-strong hover:text-foreground"
                  }`}
                >
                  0.7×
                </button>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p
                  lang="de"
                  className="text-sm leading-relaxed font-medium text-foreground sm:text-[0.9375rem]"
                >
                  <GrammarText text={item.de} />
                </p>
                <p className="text-xs leading-relaxed text-muted sm:text-sm">
                  <GrammarText text={item.vi} />
                </p>
                {item.note && (
                  <p className="mt-0.5 text-xs leading-relaxed text-accent-text/90">
                    → <GrammarText text={item.note} />
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrammarBlockRenderer({
  block,
  blockKey,
  playingKey,
  onSpeak,
}: {
  block: GrammarBlock;
  blockKey: string;
  playingKey: string | null;
  onSpeak: (key: string, text: string, slow?: boolean) => void;
}) {
  switch (block.type) {
    case "text":
      return (
        <p className="text-sm leading-relaxed text-foreground/90 sm:text-[0.9375rem]">
          <GrammarText text={block.content} />
        </p>
      );

    case "rule":
      return (
        <div className="flex flex-col gap-2 rounded-xl border border-accent/35 bg-accent-soft/35 p-4">
          <div className="text-xs font-bold tracking-wide text-accent-text uppercase">
            {block.title}
          </div>
          <p className="text-sm leading-relaxed font-semibold text-foreground sm:text-[0.95rem]">
            <GrammarText text={block.formula} />
          </p>
          {block.note && (
            <p className="text-xs leading-relaxed text-muted sm:text-sm">
              <GrammarText text={block.note} />
            </p>
          )}
        </div>
      );

    case "table":
      return (
        <div className="flex flex-col gap-2">
          {block.caption && (
            <div className="text-xs font-bold tracking-wide text-muted uppercase">
              {block.caption}
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[440px] border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-line bg-sidebar">
                  {block.headers.map((header, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="px-3.5 py-2.5 text-xs font-bold text-foreground whitespace-nowrap"
                    >
                      <GrammarText text={header} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/80">
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="transition-colors hover:bg-surface/40">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`px-3.5 py-2.5 align-top leading-relaxed ${
                          cIdx === 0 ? "font-medium text-foreground" : "text-foreground/90"
                        }`}
                      >
                        <GrammarText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "examples":
      return (
        <ExampleList
          title={block.title}
          items={block.items}
          playingKey={playingKey}
          onSpeak={onSpeak}
          keyPrefix={blockKey}
        />
      );

    case "steps":
      return (
        <div className="flex flex-col gap-2.5">
          {block.title && (
            <h4 className="text-xs font-bold tracking-wide text-muted uppercase">{block.title}</h4>
          )}
          <ol className="flex flex-col gap-2.5">
            {block.items.map((item, idx) => {
              const exKey = `${blockKey}-step-${idx}`;
              const isExPlaying = playingKey === exKey;
              const cleanEx = item.example
                ? stripGrammarMarkup(item.example).replace(/\s*·\s*/g, ". ")
                : "";
              return (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-line bg-card p-3.5 sm:p-4"
                >
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-soft font-mono text-xs font-bold text-accent-text">
                    {idx + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="text-sm font-bold text-foreground">
                      <GrammarText text={item.step} />
                    </div>
                    <p className="text-xs leading-relaxed text-muted sm:text-sm">
                      <GrammarText text={item.detail} />
                    </p>
                    {item.example && (
                      <div className="mt-1 flex items-center gap-2 rounded-lg border border-line/80 bg-sidebar px-3 py-2 text-xs leading-relaxed text-foreground sm:text-sm">
                        <button
                          type="button"
                          onClick={(e) => onSpeak(exKey, cleanEx, e.shiftKey)}
                          aria-label={isExPlaying ? "Dừng phát âm" : `Nghe ví dụ: ${cleanEx}`}
                          title="Nghe phát âm tiếng Đức (Shift + bấm để nghe chậm)"
                          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            isExPlaying
                              ? "border-accent bg-accent-soft text-accent-text"
                              : "border-line bg-card text-muted hover:border-line-strong hover:text-foreground"
                          }`}
                        >
                          {isExPlaying ? (
                            <Square className="size-3 fill-current" aria-hidden />
                          ) : (
                            <Volume2 className="size-3.5" aria-hidden />
                          )}
                        </button>
                        <div lang="de" className="min-w-0 flex-1">
                          <GrammarText text={item.example} />
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      );

    case "tip": {
      const styles =
        block.variant === "warning"
          ? {
              box: "border-amber/35 bg-amber-soft/30",
              title: "text-amber",
              Icon: AlertTriangle,
            }
          : block.variant === "note"
            ? {
                box: "border-link/30 bg-link-soft/30",
                title: "text-link",
                Icon: Info,
              }
            : {
                box: "border-ok/30 bg-ok-soft/30",
                title: "text-ok-text",
                Icon: Lightbulb,
              };
      const Icon = styles.Icon;
      return (
        <aside className={`flex items-start gap-3 rounded-xl border p-4 ${styles.box}`}>
          <Icon className={`mt-0.5 size-4 shrink-0 ${styles.title}`} aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className={`text-xs font-bold tracking-wide uppercase ${styles.title}`}>
              {block.title}
            </div>
            <p className="text-xs leading-relaxed text-foreground/90 sm:text-sm">
              <GrammarText text={block.content} />
            </p>
          </div>
        </aside>
      );
    }

    case "compare":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4">
            <h4 className="border-b border-line pb-2 text-sm font-bold text-accent-text">
              <GrammarText text={block.leftTitle} />
            </h4>
            <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-foreground/90 sm:text-sm">
              {block.leftItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>
                    <GrammarText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4">
            <h4 className="border-b border-line pb-2 text-sm font-bold text-link">
              <GrammarText text={block.rightTitle} />
            </h4>
            <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-foreground/90 sm:text-sm">
              {block.rightItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-link" aria-hidden />
                  <span>
                    <GrammarText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );

    case "list":
      return (
        <div className="flex flex-col gap-2">
          {block.title && (
            <h4 className="text-xs font-bold tracking-wide text-muted uppercase">{block.title}</h4>
          )}
          <ul className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4 text-xs leading-relaxed text-foreground/90 sm:text-sm">
            {block.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>
                  <GrammarText text={item} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

export default function GrammarLessonView({
  lesson,
  category,
  prev,
  next,
}: {
  lesson: GrammarLesson;
  category: GrammarCategory | undefined;
  prev: GrammarLesson | null;
  next: GrammarLesson | null;
}) {
  const { isDone, toggleDone, markDone } = useGrammarDone();
  const done = isDone(lesson.slug);

  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const handleSpeak = (key: string, text: string, slow = false) => {
    if (playingKey === key) {
      stopSpeaking();
      setPlayingKey(null);
      return;
    }
    setPlayingKey(key);
    void speakGerman(text, {
      slow,
      onEnd: () => {
        setPlayingKey((cur) => (cur === key ? null : cur));
      },
    });
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = lesson.quiz.reduce(
    (acc, q, idx) => (answers[idx] === q.answer ? acc + 1 : acc),
    0,
  );
  const quizFinished = lesson.quiz.length > 0 && answeredCount === lesson.quiz.length;

  const selectOption = (qIdx: number, optIdx: number) => {
    if (answers[qIdx] !== undefined) return;
    setAnswers((prevAns) => ({ ...prevAns, [qIdx]: optIdx }));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
      {/* ── Cột nội dung chính ── */}
      <article className="flex min-w-0 flex-col gap-8">
        {/* Chú giải màu cách + Mục lục rút gọn cho di động */}
        <div className="flex flex-col gap-3">
          <CaseLegend />
          <nav
            aria-label="Mục lục bài học"
            className="flex flex-wrap gap-1.5 lg:hidden"
          >
            {lesson.sections.map((sec, idx) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sidebar px-3 py-1.5 text-xs font-medium text-muted hover:border-line-strong hover:text-foreground"
              >
                <span className="font-mono text-[11px] font-bold text-accent-text">{idx + 1}</span>
                <span>{sec.heading}</span>
              </a>
            ))}
            {lesson.quiz.length > 0 && (
              <a
                href="#bai-tap-nhanh"
                className="inline-flex items-center gap-1.5 rounded-full border border-link/30 bg-link-soft px-3 py-1.5 text-xs font-semibold text-link"
              >
                Bài tập ({lesson.quiz.length})
              </a>
            )}
          </nav>
        </div>

        {/* Các phần kiến thức */}
        {lesson.sections.map((section, sIdx) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 flex flex-col gap-4"
          >
            <h2 className="flex items-center gap-2.5 border-b border-line pb-2.5 text-lg font-bold text-foreground sm:text-xl">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-line bg-sidebar font-mono text-xs font-bold text-accent-text">
                {sIdx + 1}
              </span>
              <span>{section.heading}</span>
            </h2>

            <div className="flex flex-col gap-4">
              {section.blocks.map((block, bIdx) => (
                <GrammarBlockRenderer
                  key={bIdx}
                  block={block}
                  blockKey={`${section.id}-${bIdx}`}
                  playingKey={playingKey}
                  onSpeak={handleSpeak}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Tóm tắt nhanh */}
        {lesson.keyPoints.length > 0 && (
          <section
            id="tom-tat-nhanh"
            className="scroll-mt-24 flex flex-col gap-3 rounded-xl border border-ok/30 bg-ok-soft/20 p-5"
          >
            <h2 className="flex items-center gap-2 text-base font-bold text-ok-text">
              <ListChecks className="size-5" aria-hidden />
              Tóm tắt nhanh cần nhớ
            </h2>
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/95">
              {lesson.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <Check className="mt-1 size-4 shrink-0 text-ok-text" aria-hidden />
                  <span>
                    <GrammarText text={point} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Bài tập nhanh */}
        {lesson.quiz.length > 0 && (
          <section id="bai-tap-nhanh" className="scroll-mt-24 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
              <h2 className="text-lg font-bold text-foreground sm:text-xl">
                Bài tập kiểm tra nhanh
              </h2>
              <div className="flex items-center gap-2">
                {answeredCount > 0 && (
                  <span className="badge border border-line bg-sidebar font-mono text-xs font-bold text-foreground tabular-nums">
                    Đúng {correctCount}/{lesson.quiz.length}
                  </span>
                )}
                {answeredCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAnswers({})}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-line-strong hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5" aria-hidden /> Làm lại
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {lesson.quiz.map((q, qIdx) => {
                const chosen = answers[qIdx];
                const isAnswered = chosen !== undefined;
                const isCorrect = chosen === q.answer;

                return (
                  <div key={qIdx} className="card flex flex-col gap-3 p-4 sm:p-5">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-sidebar font-mono text-xs font-bold text-accent-text">
                        {qIdx + 1}
                      </span>
                      <p className="text-sm leading-relaxed font-semibold text-foreground sm:text-[0.9375rem]">
                        <GrammarText text={q.question} />
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = chosen === optIdx;
                        const isRightOpt = q.answer === optIdx;

                        let style =
                          "border-line bg-sidebar text-foreground hover:border-line-strong hover:bg-surface";
                        if (isAnswered) {
                          if (isRightOpt) {
                            style = "border-ok/50 bg-ok-soft text-ok-text font-semibold";
                          } else if (isSelected && !isRightOpt) {
                            style = "border-red/50 bg-red-soft text-red-400";
                          } else {
                            style = "border-line/60 bg-sidebar/50 text-muted opacity-70";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => selectOption(qIdx, optIdx)}
                            className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors sm:text-sm ${style}`}
                          >
                            <span>
                              <GrammarText text={opt} />
                            </span>
                            {isAnswered && isRightOpt && (
                              <CheckCircle2 className="size-4 shrink-0 text-ok-text" aria-hidden />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div
                        className={`rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed sm:text-sm ${
                          isCorrect
                            ? "border-ok/30 bg-ok-soft/30 text-foreground"
                            : "border-amber/30 bg-amber-soft/25 text-foreground"
                        }`}
                      >
                        <strong className={isCorrect ? "text-ok-text" : "text-amber"}>
                          {isCorrect ? "Chính xác! " : "Giải thích: "}
                        </strong>
                        <GrammarText text={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {quizFinished && !done && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/35 bg-accent-soft/30 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Bạn đã làm xong {lesson.quiz.length} câu hỏi (đúng {correctCount}/{lesson.quiz.length})!
                </p>
                <button
                  type="button"
                  onClick={() => markDone(lesson.slug)}
                  className="btn btn-primary"
                >
                  <CircleCheck className="size-4" aria-hidden /> Đánh dấu đã học xong
                </button>
              </div>
            )}
          </section>
        )}

        {/* Dải gợi ý thực hành nghe nói & từ vựng cùng trình độ */}
        <section
          aria-label="Luyện tập thêm cùng trình độ"
          className="grid gap-3 sm:grid-cols-2"
        >
          <Link
            href={
              lesson.level.match(/A1|A2|B1|B2|C1|C2/)
                ? `/tieng-duc?level=${lesson.level.match(/A1|A2|B1|B2|C1|C2/)![0]}`
                : "/tieng-duc"
            }
            className="card card-link flex items-center gap-3 p-3.5 sm:p-4"
          >
            <span className="icon-bubble tint-sec size-9 shrink-0">
              <PlayCircle className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                Luyện video trình độ {lesson.level}
              </span>
              <span className="block truncate text-xs text-muted">
                Áp dụng ngữ pháp vào hội thoại thật qua Shadowing &amp; Chính tả
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
          </Link>

          <Link
            href="/vocab"
            className="card card-link flex items-center gap-3 p-3.5 sm:p-4"
          >
            <span className="icon-bubble tint-ok size-9 shrink-0">
              <BookOpen className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                Bộ từ vựng {lesson.level}
              </span>
              <span className="block truncate text-xs text-muted">
                Học từ chuẩn kèm giống der/die/das, câu ví dụ &amp; ôn SRS
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
          </Link>
        </section>

        {/* Thanh đánh dấu hoàn thành & Chuyển bài trước/sau */}
        <footer className="flex flex-col gap-4 border-t border-line pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted">
              {category ? `Chương ${category.order}: ${category.title}` : "Ngữ pháp tiếng Đức"} ·{" "}
              <span className="font-mono font-semibold text-foreground">{lesson.code}</span>
            </div>
            <button
              type="button"
              onClick={() => toggleDone(lesson.slug)}
              title={done ? "Nhấn để bỏ đánh dấu đã học xong" : "Đánh dấu đã học xong bài này"}
              className={`btn ${done ? "btn-soft border-ok/40 text-ok-text" : "btn-primary"}`}
            >
              <CheckCircle2 className="size-4" aria-hidden />
              {done ? "Đã học xong" : "Đánh dấu đã học xong"}
            </button>
          </div>

          <nav aria-label="Bài trước và bài tiếp theo" className="grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/ngu-phap/${prev.slug}`}
                className="card card-link flex items-center gap-3 p-4"
              >
                <ArrowLeft className="size-4 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-muted">Bài trước · {prev.code}</div>
                  <div className="truncate text-sm font-bold text-foreground">{prev.title}</div>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {next ? (
              <Link
                href={`/ngu-phap/${next.slug}`}
                className="card card-link flex items-center justify-between gap-3 p-4 text-right sm:justify-end"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-muted">Bài tiếp theo · {next.code}</div>
                  <div className="truncate text-sm font-bold text-foreground">{next.title}</div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-accent-text" aria-hidden />
              </Link>
            ) : (
              <Link
                href="/ngu-phap"
                className="card card-link flex items-center justify-end gap-3 p-4 text-right"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-muted">Hoàn tất lộ trình</div>
                  <div className="truncate text-sm font-bold text-accent-text">
                    Quay lại mục lục 9 chương
                  </div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-accent-text" aria-hidden />
              </Link>
            )}
          </nav>
        </footer>
      </article>

      {/* ── Cột phụ dính (Desktop TOC + trạng thái) ── */}
      <aside className="hidden lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-4">
        <button
          type="button"
          onClick={() => toggleDone(lesson.slug)}
          title={done ? "Nhấn để bỏ đánh dấu đã học xong" : "Đánh dấu đã học xong bài này"}
          className={`btn w-full justify-center text-xs ${
            done ? "btn-soft border-ok/40 text-ok-text" : "btn-primary"
          }`}
        >
          <CheckCircle2 className="size-4" aria-hidden />
          {done ? "Đã học xong" : "Đánh dấu đã học xong"}
        </button>

        <nav aria-label="Mục lục trong bài" className="card flex flex-col gap-2 p-4">
          <div className="text-xs font-bold tracking-wide text-muted uppercase">Trong bài này</div>
          <ul className="flex flex-col gap-1 text-xs">
            {lesson.sections.map((sec, idx) => (
              <li key={sec.id}>
                <a
                  href={`#${sec.id}`}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  <span className="font-mono text-[11px] font-bold text-accent-text">{idx + 1}.</span>
                  <span className="leading-snug">{sec.heading}</span>
                </a>
              </li>
            ))}
            {lesson.keyPoints.length > 0 && (
              <li>
                <a
                  href="#tom-tat-nhanh"
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  <span className="font-mono text-[11px] font-bold text-ok-text">✓</span>
                  <span>Tóm tắt nhanh</span>
                </a>
              </li>
            )}
            {lesson.quiz.length > 0 && (
              <li>
                <a
                  href="#bai-tap-nhanh"
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  <span className="font-mono text-[11px] font-bold text-link">?</span>
                  <span>Bài tập ({lesson.quiz.length} câu)</span>
                </a>
              </li>
            )}
          </ul>
        </nav>

        <Link
          href="/ngu-phap"
          className="inline-flex items-center gap-1.5 px-2 text-xs font-semibold text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Tất cả 9 chương ngữ pháp
        </Link>
      </aside>
    </div>
  );
}
