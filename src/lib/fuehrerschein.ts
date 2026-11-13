import "server-only";
import { cookies } from "next/headers";
import data from "@/content/fuehrerschein/questions.json";
import { NUM_HINTS } from "./fuehrerschein-units";
import { isLang, type DrivingQ, type ExamConfig, type Lang, type Tr } from "./fuehrerschein-rules";

// Bộ câu hỏi lý thuyết lái xe Đức cho mọi hạng bằng (nhập bằng scripts/import-portal-content.mjs, giống app iOS/Android)

type Raw = (typeof data.questions)[number];

export type ClassId = (typeof data.classOrder)[number];
export const CLASS_ORDER = data.classOrder as ClassId[];
export const DEFAULT_CLASS: ClassId = "B";
export const isClassId = (v: unknown): v is ClassId => (CLASS_ORDER as unknown[]).includes(v);

/** Nhóm loại xe của màn chọn hạng */
export const CLASS_GROUPS: { title: string; classes: ClassId[] }[] = [
  { title: "Ô tô", classes: ["B"] },
  { title: "Mô tô, xe máy", classes: ["A", "A2", "A1", "AM", "Mofa"] },
  { title: "Xe tải", classes: ["C", "CE", "C1"] },
  { title: "Xe buýt", classes: ["D", "D1"] },
  { title: "Nông nghiệp", classes: ["L", "T"] },
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
export const totalQuestions = () => ALL.length;
export const catalogDate = () => data.date;

const names = (map: Record<string, { de: string; vi: string }>, id: string, fallback: string) => map[id] ?? { de: fallback, vi: "" };
export const chapterName = (id: string) => names(data.chapters, id, `Kapitel ${id}`);
export const themeName = (id: string) => names(data.themes, id, `Thema ${id}`);

// ---- Lựa chọn của người học (cookie, dùng được cả khi chưa đăng nhập) ----

export const CLASS_COOKIE = "lx_class";
export const LANG_COOKIE = "lx_lang";

/** Hạng đang học + ngôn ngữ bản dịch. Gọi trong <Suspense> (đọc cookie) */
export async function prefs(): Promise<{ cls: ClassId; lang: Lang }> {
  const jar = await cookies();
  const c = jar.get(CLASS_COOKIE)?.value;
  const l = jar.get(LANG_COOKIE)?.value;
  return { cls: isClassId(c) ? c : DEFAULT_CLASS, lang: isLang(l) ? l : "vi" };
}

/** Danh sách hạng theo nhóm xe, kèm số câu và luật thi (cho trang chọn hạng / Cài đặt) */
export function classGroups() {
  return CLASS_GROUPS.map((g) => ({
    title: g.title,
    classes: g.classes.map((id) => {
      const c = classInfo(id);
      return { id, name: c.name, description: c.description, vi: c.vi, count: classQuestionIds(id).length, exam: `${c.exam.questions} câu, ≤ ${c.exam.maxErrorPoints} điểm lỗi` };
    }),
  }));
}

// ---- Cây học theo chủ đề: phần cơ bản / phần riêng hạng → chủ đề → chương ----

export type ChapterNode = { id: string; de: string; vi: string; ids: string[] };
export type ThemeNode = { id: string; de: string; vi: string; ids: string[]; chapters: ChapterNode[] };
export type PartNode = { key: "grund" | "zusatz"; title: string; subtitle: string; ids: string[]; themes: ThemeNode[] };

export function learnTree(cls: ClassId): PartNode[] {
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
    return {
      key,
      title: key === "grund" ? "Grundstoff" : `Zusatzstoff ${cls}`,
      subtitle: key === "grund" ? "Phần cơ bản, chung cho mọi hạng" : `Phần riêng của hạng ${cls}`,
      ids: list.flatMap((t) => t.ids),
      themes: list,
    };
  };
  return [part("grund"), part("zusatz")].filter((p) => p.ids.length);
}

/** Phạm vi học: "grund" / "zusatz" / chủ đề "1.1" / chương "1.1.01" (chỉ các câu thuộc hạng đang học) */
export function scopeQuestions(scope: string, cls: ClassId): { title: string; subtitle: string; ids: string[] } | null {
  const tree = learnTree(cls);
  for (const p of tree) {
    if (p.key === scope) return { title: p.title, subtitle: p.subtitle, ids: p.ids };
    for (const t of p.themes) {
      if (t.id === scope) return { title: t.vi || t.de, subtitle: `Thema ${t.id} · ${t.de}`, ids: t.ids };
      const c = t.chapters.find((x) => x.id === scope);
      if (c) return { title: c.vi || c.de, subtitle: `Kapitel ${c.id} · ${c.de}`, ids: c.ids };
    }
  }
  return null;
}

/** Các phạm vi học có câu ở ít nhất 1 hạng (cho sitemap) */
export const allChapterIds = () => [...new Set(ALL.filter((q) => q.cls).map((q) => q.chapter))];

// ---- Đề thi ----

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Đề thi thử ngẫu nhiên của 1 hạng: `grundstoff` câu phần cơ bản + phần còn lại từ phần riêng (giống đề mẫu chính thức).
 * Thiếu câu ở 1 phần thì lấy bù từ phần kia. Phần cơ bản hiện trước. Gọi sau connection()/cookies() (dùng Math.random).
 */
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

/** 99 đề mẫu chính thức hạng B (mỗi đề 20 câu cơ bản + 10 câu hạng B) */
export const BOGEN_COUNT = data.musterboegen.length;
export const bogenIds = (n: number): string[] | null => data.musterboegen[n - 1] ?? null;

// ---- Gửi câu xuống trình duyệt ----

const PACKS: Record<Exclude<Lang, "vi">, () => Promise<Record<string, Tr>>> = {
  en: () => import("@/content/fuehrerschein/tr-en.json").then((m) => m.default as Record<string, Tr>),
  ar: () => import("@/content/fuehrerschein/tr-ar.json").then((m) => m.default as Record<string, Tr>),
  zh: () => import("@/content/fuehrerschein/tr-zh.json").then((m) => m.default as Record<string, Tr>),
  ru: () => import("@/content/fuehrerschein/tr-ru.json").then((m) => m.default as Record<string, Tr>),
};

/** Không xáo khi lựa chọn trống chữ: chúng chỉ tới nhãn A/B/C trong hình */
const optionOrder = (q: Raw, shuffled: boolean) => {
  const idx = q.options.map((_, i) => i);
  return shuffled && q.options.length > 1 && q.options.every((o) => o.text.trim()) ? shuffle(idx) : idx;
};

/**
 * Câu theo thứ tự `ids` (bỏ id không có), kèm bản dịch `lang` và thứ tự lựa chọn.
 * `orders`: thứ tự đã dùng khi làm bài (xem lại bài thi); không có thì xáo mới — khi đó gọi sau connection()/cookies().
 */
export async function forClient(ids: string[], lang: Lang, orders?: Record<string, number[]>): Promise<DrivingQ[]> {
  const pack = lang === "vi" ? null : await PACKS[lang]();
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
        video: q.video,
        tr: (pack ? pack[q.id] : q.vi) ?? null,
        order,
      },
    ];
  });
}

/** Dữ liệu chấm bài (server tự chấm lại, không tin kết quả từ trình duyệt) */
export const gradable = (ids: string[]) => ids.flatMap((id) => (BY_ID.has(id) ? [BY_ID.get(id)!] : []));
