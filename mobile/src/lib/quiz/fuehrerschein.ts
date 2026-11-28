import data from "@content/fuehrerschein/questions.json";
import { NUM_HINTS } from "@shared/laixe/units";
import type { DrivingQ, ExamConfig } from "@shared/laixe/rules";
import { CLASS_IDS as LIGHT_CLASS_IDS } from "./ids";
import { hallovnMedia } from "./media";
import { l } from "./strings";
import { shuffle } from "./util";

// Bộ câu hỏi lý thuyết lái xe cho mọi hạng — cùng file dữ liệu với tab Lái xe của web (src/content/fuehrerschein),
// đóng gói trong app nên học được khi không có mạng. Bản app của src/lib/laixe/index.ts (không đọc cookie / server).

type Raw = (typeof data.questions)[number];

export type ClassId = (typeof data.classOrder)[number];
export const CLASS_ORDER = data.classOrder as ClassId[];
export { DEFAULT_CLASS } from "./ids";
export const isClassId = (v: unknown): v is ClassId => (CLASS_ORDER as unknown[]).includes(v);
if (__DEV__ && CLASS_ORDER.join() !== LIGHT_CLASS_IDS.join()) console.warn("quiz/ids.ts: CLASS_IDS lệch với questions.json");

export const CLASS_GROUPS: { title: string; de: string; classes: ClassId[] }[] = [
  { title: "Ô tô", de: "Pkw", classes: ["B"] },
  { title: "Mô tô, xe máy", de: "Motorrad", classes: ["A", "A2", "A1", "AM", "Mofa"] },
  { title: "Xe tải", de: "Lkw", classes: ["C", "CE", "C1"] },
  { title: "Xe buýt", de: "Bus", classes: ["D", "D1"] },
  { title: "Nông nghiệp", de: "Landwirtschaft", classes: ["L", "T"] },
];

export type ClassInfo = { id: ClassId; name: string; description: string; vi: string; exam: ExamConfig };
export const classInfo = (id: ClassId): ClassInfo => ({ id, ...(data.classes as Record<string, Omit<ClassInfo, "id">>)[id] });

const ALL = data.questions;
const BY_ID = new Map(ALL.map((q) => [q.id, q]));
const CLASS_IDS = new Map<ClassId, Raw[]>(CLASS_ORDER.map((c) => [c, ALL.filter((q) => q.cls.split(",").includes(c))]));

export const hasQuestion = (id: string) => BY_ID.has(id);
export const isGrund = (id: string) => id.startsWith("1.");
export const classQuestions = (cls: ClassId) => CLASS_IDS.get(cls)!;
export const classQuestionIds = (cls: ClassId) => classQuestions(cls).map((q) => q.id);
export const catalogDate = () => data.date;

const names = (map: Record<string, { de: string; vi: string }>, id: string, fallback: string) => map[id] ?? { de: fallback, vi: "" };
export const chapterName = (id: string) => names(data.chapters, id, `Kapitel ${id}`);
export const themeName = (id: string) => names(data.themes, id, `Thema ${id}`);

// ---- Cây học theo chủ đề: phần cơ bản / phần riêng hạng → chủ đề → chương ----

export type ChapterNode = { id: string; de: string; vi: string; ids: string[] };
export type ThemeNode = { id: string; de: string; vi: string; ids: string[]; chapters: ChapterNode[] };
export type PartNode = { key: "grund" | "zusatz"; title: string; ids: string[]; themes: ThemeNode[] };

const trees = new Map<ClassId, PartNode[]>();
export function learnTree(cls: ClassId): PartNode[] {
  const cached = trees.get(cls);
  if (cached) return cached;
  const qs = classQuestions(cls);
  const part = (key: PartNode["key"]): PartNode => {
    const themes = new Map<string, ThemeNode>();
    for (const q of qs) {
      if (isGrund(q.id) !== (key === "grund")) continue;
      let t = themes.get(q.theme);
      if (!t) themes.set(q.theme, (t = { id: q.theme, ...themeName(q.theme), ids: [], chapters: [] }));
      let c = t.chapters.find((x) => x.id === q.chapter);
      if (!c) t.chapters.push((c = { id: q.chapter, ...chapterName(q.chapter), ids: [] }));
      c.ids.push(q.id);
      t.ids.push(q.id);
    }
    const list = [...themes.values()];
    return { key, title: key === "grund" ? "Grundstoff" : `Zusatzstoff ${cls}`, ids: list.flatMap((t) => t.ids), themes: list };
  };
  const tree = [part("grund"), part("zusatz")].filter((p) => p.ids.length);
  trees.set(cls, tree);
  return tree;
}

/** Phạm vi học: "all" / "grund" / "zusatz" / chủ đề "1.1" / chương "1.1.01" (chỉ câu thuộc hạng đang học) */
export function scopeQuestions(scope: string, cls: ClassId): { title: string; subtitle: string; ids: string[] } | null {
  const info = classInfo(cls);
  if (scope === "all") return { title: `${l("Hạng", "Klasse")} ${cls}`, subtitle: l(info.vi, info.description), ids: classQuestionIds(cls) };
  for (const p of learnTree(cls)) {
    if (p.key === scope) return { title: p.title, subtitle: "", ids: p.ids };
    for (const t of p.themes) {
      if (t.id === scope) return { title: l(t.vi || t.de, t.de), subtitle: `Thema ${t.id} · ${t.de}`, ids: t.ids };
      const c = t.chapters.find((x) => x.id === scope);
      if (c) return { title: l(c.vi || c.de, c.de), subtitle: `Kapitel ${c.id} · ${c.de}`, ids: c.ids };
    }
  }
  return null;
}

// ---- Đề thi ----

/** Đề thi thử ngẫu nhiên của 1 hạng: `grundstoff` câu phần cơ bản + phần còn lại từ phần riêng (như web / đề chính thức) */
export function examQuestionIds(cls: ClassId): string[] {
  const { questions: total, grundstoff } = classInfo(cls).exam;
  const qs = classQuestions(cls);
  const grund = shuffle(qs.filter((q) => isGrund(q.id)));
  const zusatz = shuffle(qs.filter((q) => !isGrund(q.id)));
  const takeGrund = Math.min(grundstoff, grund.length, total);
  const picked = [...grund.slice(0, takeGrund), ...zusatz.slice(0, total - takeGrund)];
  for (const q of grund.slice(takeGrund)) if (picked.length < total) picked.push(q);
  return picked.sort((a, b) => +isGrund(b.id) - +isGrund(a.id)).map((q) => q.id);
}

/** Đề mẫu chính thức hạng B (mỗi đề 20 câu cơ bản + 10 câu hạng B) */
export const BOGEN_COUNT = data.musterboegen.length;
export const bogenIds = (n: number): string[] | null => data.musterboegen[n - 1] ?? null;

// ---- Câu cho màn làm bài ----


/** Không xáo khi lựa chọn trống chữ: chúng chỉ tới nhãn A/B/C trong hình */
const optionOrder = (q: Raw, shuffled: boolean) => {
  const idx = q.options.map((_, i) => i);
  return shuffled && q.options.length > 1 && q.options.every((o) => o.text.trim()) ? shuffle(idx) : idx;
};

/** Câu theo thứ tự `ids` kèm bản dịch; `orders` = thứ tự lựa chọn đã dùng (xem lại bài thi), không có thì xáo mới */
export function questions(ids: string[], orders?: Record<string, number[]>): DrivingQ[] {
  return ids.flatMap((id) => {
    const q = BY_ID.get(id);
    if (!q) return [];
    const saved = orders?.[id];
    const order = saved && saved.length === q.options.length ? saved : optionOrder(q, !orders);
    return [
      {
        id: q.id,
        chapter: q.chapter,
        points: q.points,
        grund: isGrund(q.id),
        q: q.q,
        stem: q.stem,
        options: q.options,
        num: q.options.length ? null : (NUM_HINTS[q.id] ?? null),
        answer: q.answer,
        explain: q.explain,
        images: q.images,
        optionImages: q.optionImages,
        poster: q.poster,
        video: q.video ? hallovnMedia(q.video) : q.video,
        tr: q.vi ?? null,
        order,
      },
    ];
  });
}
