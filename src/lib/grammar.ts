import { ADJEKTIVE_LESSONS } from "@/content/grammar/adjektive";
import { ADVERBIEN_LESSONS } from "@/content/grammar/adverbien";
import { ARTIKEL_LESSONS } from "@/content/grammar/artikel";
import { NOMEN_LESSONS } from "@/content/grammar/nomen";
import { PRAEPOSITIONEN_LESSONS } from "@/content/grammar/praepositionen";
import { PRONOMEN_LESSONS } from "@/content/grammar/pronomen";
import { SATZBAU_LESSONS } from "@/content/grammar/satzbau";
import {
  GRAMMAR_CATEGORIES,
  type GrammarCategory,
  type GrammarCategoryId,
  type GrammarLesson,
  type GrammarLevel,
} from "@/content/grammar/types";
import { VERBEN_LESSONS } from "@/content/grammar/verben";
import { ZEITFORMEN_LESSONS } from "@/content/grammar/zeitformen";

export { GRAMMAR_CATEGORIES };
export type {
  GrammarBlock,
  GrammarCategory,
  GrammarCategoryId,
  GrammarExample,
  GrammarLesson,
  GrammarLevel,
  GrammarQuizItem,
  GrammarSection,
} from "@/content/grammar/types";

export const GRAMMAR_LEVELS: readonly GrammarLevel[] = ["A1", "A2", "B1", "B2"] as const;

const CATEGORY_ORDER = new Map<GrammarCategoryId, number>(
  GRAMMAR_CATEGORIES.map((c) => [c.id, c.order]),
);

const CATEGORY_MAP = new Map<GrammarCategoryId, GrammarCategory>(
  GRAMMAR_CATEGORIES.map((c) => [c.id, c]),
);

export const ALL_GRAMMAR_LESSONS: GrammarLesson[] = [
  ...NOMEN_LESSONS,
  ...ARTIKEL_LESSONS,
  ...PRONOMEN_LESSONS,
  ...VERBEN_LESSONS,
  ...ZEITFORMEN_LESSONS,
  ...ADJEKTIVE_LESSONS,
  ...ADVERBIEN_LESSONS,
  ...PRAEPOSITIONEN_LESSONS,
  ...SATZBAU_LESSONS,
].sort((a, b) => {
  const ca = CATEGORY_ORDER.get(a.categoryId) ?? 99;
  const cb = CATEGORY_ORDER.get(b.categoryId) ?? 99;
  return ca !== cb ? ca - cb : a.order - b.order;
});

const LESSON_MAP = new Map<string, GrammarLesson>(
  ALL_GRAMMAR_LESSONS.map((lesson) => [lesson.slug, lesson]),
);

export type GrammarLessonSummary = Pick<
  GrammarLesson,
  "slug" | "categoryId" | "order" | "code" | "title" | "germanTitle" | "level" | "summary"
> & {
  sectionCount: number;
  quizCount: number;
};

export const ALL_GRAMMAR_SUMMARIES: GrammarLessonSummary[] = ALL_GRAMMAR_LESSONS.map((l) => ({
  slug: l.slug,
  categoryId: l.categoryId,
  order: l.order,
  code: l.code,
  title: l.title,
  germanTitle: l.germanTitle,
  level: l.level,
  summary: l.summary,
  sectionCount: l.sections.length,
  quizCount: l.quiz.length,
}));

export function getGrammarCategory(id: GrammarCategoryId): GrammarCategory | undefined {
  return CATEGORY_MAP.get(id);
}

export function getGrammarLesson(slug: string): GrammarLesson | undefined {
  return LESSON_MAP.get(slug);
}

export function getLessonsByCategory(categoryId: GrammarCategoryId): GrammarLesson[] {
  return ALL_GRAMMAR_LESSONS.filter((l) => l.categoryId === categoryId);
}

export function getAdjacentLessons(slug: string): {
  prev: GrammarLesson | null;
  next: GrammarLesson | null;
} {
  const idx = ALL_GRAMMAR_LESSONS.findIndex((l) => l.slug === slug);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? ALL_GRAMMAR_LESSONS[idx - 1] : null,
    next: idx < ALL_GRAMMAR_LESSONS.length - 1 ? ALL_GRAMMAR_LESSONS[idx + 1] : null,
  };
}

/**
 * Loại bỏ các thẻ đánh dấu cách {nom:...}, {akk:...}, {dat:...}, {gen:...}
 * và markdown in đậm/nghiêng để phát âm TTS hoặc tạo đoạn mô tả thuần.
 */
export function stripGrammarMarkup(text: string): string {
  let out = text;
  // Lặp để bóc lồng nhau nếu có (vd: **{dat:...}**)
  let prev = "";
  while (out !== prev) {
    prev = out;
    out = out.replace(/\{(?:nom|akk|dat|gen):([^{}]*)\}/g, "$1");
  }
  return out
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
