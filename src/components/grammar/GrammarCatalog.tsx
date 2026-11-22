"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import LevelBadge from "@/components/LevelBadge";
import { CaseLegend } from "@/components/grammar/GrammarText";
import {
  GRAMMAR_LEVELS,
  type GrammarCategory,
  type GrammarLessonSummary,
  type GrammarLevel,
} from "@/lib/grammar";
import { useGrammarDone } from "@/lib/grammar-progress";

function normalizeVi(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss");
}

type StatusFilter = "all" | "todo" | "done";

export default function GrammarCatalog({
  categories,
  lessons,
}: {
  categories: GrammarCategory[];
  lessons: GrammarLessonSummary[];
}) {
  const { doneSlugs, isDone } = useGrammarDone();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<GrammarLevel | "ALL">("ALL");
  const [status, setStatus] = useState<StatusFilter>("all");

  const totalLessons = lessons.length;
  const doneSet = useMemo(() => new Set(doneSlugs), [doneSlugs]);
  const completedCount = useMemo(
    () => lessons.filter((l) => doneSet.has(l.slug)).length,
    [lessons, doneSet],
  );
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filteredLessons = useMemo(() => {
    const q = normalizeVi(query.trim());
    return lessons.filter((l) => {
      if (level !== "ALL" && l.level !== level) return false;
      const done = doneSet.has(l.slug);
      if (status === "done" && !done) return false;
      if (status === "todo" && done) return false;
      if (!q) return true;
      const cat = catMap.get(l.categoryId);
      const haystack = normalizeVi(
        `${l.code} ${l.title} ${l.germanTitle} ${l.summary} ${cat?.title ?? ""} ${cat?.germanTitle ?? ""}`,
      );
      return haystack.includes(q);
    });
  }, [lessons, query, level, status, doneSet, catMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, GrammarLessonSummary[]>();
    for (const l of filteredLessons) {
      const list = map.get(l.categoryId);
      if (list) list.push(l);
      else map.set(l.categoryId, [l]);
    }
    return categories
      .map((cat) => ({
        category: cat,
        items: map.get(cat.id) ?? [],
        totalInCat: lessons.filter((l) => l.categoryId === cat.id).length,
        doneInCat: lessons.filter((l) => l.categoryId === cat.id && doneSet.has(l.slug)).length,
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, filteredLessons, lessons, doneSet]);

  const hasActiveFilter = query.trim().length > 0 || level !== "ALL" || status !== "all";

  const nextRecommended = useMemo(
    () => lessons.find((l) => !doneSet.has(l.slug)) ?? lessons[0],
    [lessons, doneSet],
  );

  return (
    <div className="flex flex-col gap-7">
      {/* Thanh tiến độ + gợi ý bài tiếp theo */}
      <section className="card grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpenCheck className="size-4 text-accent-text" aria-hidden />
              Tiến độ ngữ pháp của bạn
            </span>
            <span className="font-mono text-xs font-semibold text-accent-text tabular-nums">
              {completedCount} / {totalLessons} bài ({pct}%)
            </span>
          </div>
          <div className="progress h-2">
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted">
            Tiến độ được lưu ngay trên thiết bị của bạn — học từng chương theo lộ trình A1 → B2 hoặc tra cứu nhanh bất kỳ chủ điểm nào.
          </p>
        </div>

        {nextRecommended && (
          <Link
            href={`/ngu-phap/${nextRecommended.slug}`}
            className="btn btn-primary shrink-0 justify-center"
          >
            <Sparkles className="size-4" aria-hidden />
            <span className="truncate max-w-[22ch]">
              {completedCount === 0 ? "Bắt đầu bài 1" : `Học tiếp: ${nextRecommended.code}`}
            </span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </section>

      {/* Bộ lọc tìm kiếm + Trình độ + Trạng thái */}
      <section className="flex flex-col gap-3.5" aria-label="Tìm kiếm và lọc bài ngữ pháp">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm chủ điểm ngữ pháp (vd: Dativ, Perfekt, Konjunktiv, Wechselpräpositionen, không cần dấu)…"
              aria-label="Tìm chủ điểm ngữ pháp"
              className="h-11 w-full rounded-xl border border-line bg-card pr-10 pl-10 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute top-1/2 right-2.5 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["ALL", ...GRAMMAR_LEVELS] as const).map((lv) => {
              const active = level === lv;
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLevel(lv)}
                  className={`h-10 rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-accent/45 bg-accent-soft text-accent-text"
                      : "border-line bg-card text-muted hover:border-line-strong hover:text-foreground"
                  }`}
                >
                  {lv === "ALL" ? "Mọi trình độ" : lv}
                </button>
              );
            })}
            <select
              aria-label="Lọc theo trạng thái học"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-10 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-foreground focus:border-accent focus:outline-none"
            >
              <option value="all">Tất cả bài</option>
              <option value="todo">Chưa học</option>
              <option value="done">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        {/* Nhảy nhanh đến từng chương */}
        {!hasActiveFilter && (
          <nav aria-label="Nhảy nhanh tới từng chương" className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#chuong-${cat.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sidebar px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-foreground"
              >
                <span className="font-mono text-[11px] font-bold text-accent-text">{cat.order}</span>
                <span>{cat.title}</span>
              </a>
            ))}
          </nav>
        )}

        <CaseLegend />
      </section>

      {/* Danh sách 9 chương */}
      {grouped.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-base font-semibold text-foreground">
            Không tìm thấy bài ngữ pháp phù hợp
          </p>
          <p className="max-w-[44ch] text-sm text-muted">
            Thử từ khóa ngắn hơn (ví dụ: &ldquo;Dativ&rdquo;, &ldquo;Perfekt&rdquo;, &ldquo;Passiv&rdquo;, &ldquo;câu hỏi&rdquo;) hoặc đặt lại bộ lọc.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setLevel("ALL");
              setStatus("all");
            }}
            className="btn btn-soft mt-1"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-9">
          {grouped.map(({ category, items, totalInCat, doneInCat }) => (
            <section
              key={category.id}
              id={`chuong-${category.id}`}
              className="scroll-mt-24 flex flex-col gap-3.5"
            >
              <div className="flex flex-col gap-1.5 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-lg border border-accent/35 bg-accent-soft font-mono text-xs font-bold text-accent-text">
                      {category.order}
                    </span>
                    <h2 className="section-title">{category.title}</h2>
                    <span lang="de" className="text-sm font-medium text-muted">
                      · {category.germanTitle}
                    </span>
                  </div>
                  <p className="max-w-[68ch] text-xs leading-relaxed text-muted sm:text-sm">
                    {category.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
                  <span className="badge border border-line bg-sidebar font-semibold text-foreground">
                    {category.levelRange}
                  </span>
                  <span className="font-mono tabular-nums">
                    {doneInCat}/{totalInCat} bài
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((lesson) => {
                  const done = isDone(lesson.slug);
                  return (
                    <Link
                      key={lesson.slug}
                      href={`/ngu-phap/${lesson.slug}`}
                      className={`card card-link group flex flex-col justify-between gap-3 p-4 transition-colors ${
                        done ? "border-ok/35 bg-card" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md border border-line bg-sidebar px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                              {lesson.code}
                            </span>
                            <LevelBadge level={lesson.level} />
                          </div>
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok-text">
                              <CheckCircle2 className="size-4" aria-hidden /> Đã học
                            </span>
                          ) : (
                            <ArrowRight
                              className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-text"
                              aria-hidden
                            />
                          )}
                        </div>

                        <div>
                          <h3 className="text-[0.9375rem] leading-snug font-bold text-foreground group-hover:text-accent-text">
                            {lesson.title}
                          </h3>
                          <p lang="de" className="mt-0.5 text-xs font-medium text-muted">
                            {lesson.germanTitle}
                          </p>
                        </div>

                        <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                          {lesson.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 border-t border-line/70 pt-2.5 text-[11px] text-muted">
                        <span>{lesson.sectionCount} phần kiến thức</span>
                        {lesson.quizCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <CircleHelp className="size-3 text-link" aria-hidden />
                            {lesson.quizCount} câu bài tập
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
