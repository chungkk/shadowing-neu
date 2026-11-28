import { useSyncExternalStore } from "react";
import { File, Paths } from "expo-file-system";
import { ADJEKTIVE_LESSONS } from "@content/grammar/adjektive";
import { ADVERBIEN_LESSONS } from "@content/grammar/adverbien";
import { ARTIKEL_LESSONS } from "@content/grammar/artikel";
import { NOMEN_LESSONS } from "@content/grammar/nomen";
import { PRAEPOSITIONEN_LESSONS } from "@content/grammar/praepositionen";
import { PRONOMEN_LESSONS } from "@content/grammar/pronomen";
import { SATZBAU_LESSONS } from "@content/grammar/satzbau";
import {
  GRAMMAR_CATEGORIES,
  type GrammarCategory,
  type GrammarCategoryId,
  type GrammarLesson,
  type GrammarLevel,
} from "@content/grammar/types";
import { VERBEN_LESSONS } from "@content/grammar/verben";
import { ZEITFORMEN_LESSONS } from "@content/grammar/zeitformen";

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
} from "@content/grammar/types";

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

export function getGrammarCategory(id: GrammarCategoryId): GrammarCategory | undefined {
  return CATEGORY_MAP.get(id);
}

export function getGrammarLesson(slug: string): GrammarLesson | undefined {
  return LESSON_MAP.get(slug);
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

/** Bóc thẻ màu cách {nom:...}, {akk:...}, {dat:...}, {gen:...} và markdown in đậm/nghiêng để đọc TTS */
export function stripGrammarMarkup(text: string): string {
  let out = text;
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

// ---- Tiến độ Ngữ pháp lưu offline trên máy ----

const doneFile = new File(Paths.document, "grammar-done.json");
const listeners = new Set<() => void>();
let doneSlugs: string[] | null = null;

function readDone(): string[] {
  if (doneSlugs) return doneSlugs;
  try {
    if (doneFile.exists) {
      const parsed = JSON.parse(doneFile.textSync()) as unknown;
      if (Array.isArray(parsed)) {
        doneSlugs = parsed.filter((x): x is string => typeof x === "string");
        return doneSlugs;
      }
    }
  } catch {}
  doneSlugs = [];
  return doneSlugs;
}

function writeDone(list: string[]) {
  doneSlugs = list;
  try {
    doneFile.write(JSON.stringify(list));
  } catch {}
  listeners.forEach((l) => l());
}

export function markGrammarDone(slug: string) {
  const cur = readDone();
  if (!cur.includes(slug)) writeDone([...cur, slug]);
}

export function toggleGrammarDone(slug: string) {
  const cur = readDone();
  if (cur.includes(slug)) writeDone(cur.filter((s) => s !== slug));
  else writeDone([...cur, slug]);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

export function useGrammarDone() {
  const list = useSyncExternalStore(subscribe, readDone);
  return {
    doneSlugs: list,
    isDone: (slug: string) => list.includes(slug),
    markDone: markGrammarDone,
    toggleDone: toggleGrammarDone,
  };
}
