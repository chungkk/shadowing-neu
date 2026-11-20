import "server-only";
import { createHash } from "node:crypto";
import { getTranslations, listLessons, type LessonSummary, type NounGender } from "./db";
import { getDeck, listDecks, type Deck } from "./decks";
import type { Phrase } from "./phrase-match";
import { mergeIntoSentences, type Segment } from "./subtitles";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type LevelCatalogInfo = {
  level: CefrLevel;
  slug: Lowercase<CefrLevel>;
  title: string;
  heading: string;
  description: string;
  intro: string;
  deckSlug: string;
  nextLevel?: CefrLevel;
};

export const LEVEL_CATALOG: Record<CefrLevel, LevelCatalogInfo> = {
  A1: {
    level: "A1",
    slug: "a1",
    title: "Luyện nghe nói tiếng Đức A1 qua video – Shadowing & Dictation",
    heading: "Học tiếng Đức A1 qua video",
    description:
      "Luyện nghe nói tiếng Đức trình độ A1 qua video YouTube chậm, dễ hiểu: phụ đề từng câu, dịch tiếng Việt, chép chính tả Dictation và Shadowing miễn phí.",
    intro:
      "Dành cho người mới bắt đầu xây nền phát âm và phản xạ nghe câu ngắn. Hãy nghe chậm từng câu, chép chính tả những từ quen thuộc rồi nói nhại theo ngữ điệu chuẩn để hình thành thói quen phát âm đúng ngay từ đầu.",
    deckSlug: "goethe-a1",
    nextLevel: "A2",
  },
  A2: {
    level: "A2",
    slug: "a2",
    title: "Luyện nghe nói tiếng Đức A2 qua video – Giao tiếp đời sống",
    heading: "Học tiếng Đức A2 qua video",
    description:
      "Luyện nghe tiếng Đức A2 qua video hội thoại đời sống tại Đức: phụ đề Đức–Việt, tra từ theo ngữ cảnh, bài tập chính tả Dictation và Shadowing từng câu.",
    intro:
      "Ở trình độ A2, bạn bắt đầu nghe các đoạn hội thoại đời sống dài hơn (đi siêu thị, khám bệnh, công việc, nhà ở). Kết hợp chép chính tả để không sót giới từ/đuôi chia động từ và nói nhại để câu nói trôi chảy hơn.",
    deckSlug: "goethe-a2",
    nextLevel: "B1",
  },
  B1: {
    level: "B1",
    slug: "b1",
    title: "Luyện nghe nói tiếng Đức B1 qua video – Shadowing & Dictation",
    heading: "Học tiếng Đức B1 qua video",
    description:
      "Luyện nghe tiếng Đức B1 qua video thực tế: học từ vựng theo ngữ cảnh, chép chính tả Dictation, luyện nói Shadowing và nghe không phụ đề để lên B2.",
    intro:
      "B1 là bước ngoặt từ hiểu từng câu rời rạc sang nghe hiểu câu chuyện trọn vẹn với tốc độ tự nhiên. Luyện đều 20 câu mỗi ngày theo 3 giai đoạn: Nghe hiểu (Dictation) → Shadowing ngữ điệu → Nghe không phụ đề để tạo đà lên B2.",
    deckSlug: "goethe-b1",
    nextLevel: "B2",
  },
  B2: {
    level: "B2",
    slug: "b2",
    title: "Luyện nghe nói tiếng Đức B2 qua video – Nghe hiểu & Phản xạ",
    heading: "Học tiếng Đức B2 qua video",
    description:
      "Luyện nghe nói tiếng Đức B2 qua video báo chí, phóng sự và hội thoại tự nhiên: cụm từ cố định, từ vựng Aspekte B2, Dictation và Shadowing tốc độ bản xứ.",
    intro:
      "Trình độ B2 đòi hỏi nghe kịp tốc độ nói thật, nhận diện cụm từ cố định (Redewendungen, Nomen-Verb-Verbindungen) và tóm tắt được ý chính. Tập trung vào Shadowing nối âm và luyện nghe ẩn phụ đề.",
    deckSlug: "aspekte-neu-b2",
    nextLevel: "C1",
  },
  C1: {
    level: "C1",
    slug: "c1",
    title: "Luyện nghe nói tiếng Đức C1 qua video – Tiếng Đức nâng cao",
    heading: "Học tiếng Đức C1 qua video",
    description:
      "Luyện nghe nói tiếng Đức C1 qua video chuyên sâu, thảo luận và phóng sự: phân tích sắc thái từ vựng, cụm từ cố định và luyện nói Shadowing nâng cao.",
    intro:
      "Trình độ C1 rèn khả năng nghe hiểu bài nói dài, lập luận phức tạp và sắc thái diễn đạt tự nhiên như người bản xứ trong học tập và công việc tại Đức.",
    deckSlug: "nomen-verb-verbindungen",
    nextLevel: "C2",
  },
  C2: {
    level: "C2",
    slug: "c2",
    title: "Luyện nghe nói tiếng Đức C2 qua video – Trình độ bản xứ",
    heading: "Học tiếng Đức C2 qua video",
    description:
      "Luyện nghe nói tiếng Đức C2 với nội dung bản xứ tốc độ cao: nắm bắt thành ngữ, ẩn ý, chép chính tả chuyên sâu và Shadowing chuẩn ngữ điệu Đức.",
    intro:
      "Dành cho người học muốn tinh chỉnh độ chính xác, nhịp nói và vốn diễn đạt bản xứ ở mức thành thạo cao nhất.",
    deckSlug: "nomen-verb-verbindungen",
  },
};

export const CEFR_LEVELS: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function parseCefrLevel(raw: string): CefrLevel | null {
  const up = raw.trim().toUpperCase();
  return (CEFR_LEVELS as readonly string[]).includes(up) ? (up as CefrLevel) : null;
}

export const levelCatalogPath = (level: string) => `/tieng-duc/trinh-do/${level.trim().toLowerCase()}`;

/** Các trình độ hiện thực sự có bài học công khai (dùng cho sitemap & nav — không tạo trang rỗng/nội dung mỏng) */
export function activeLessonLevels(): { info: LevelCatalogInfo; count: number }[] {
  const counts = new Map<string, number>();
  for (const l of listLessons()) counts.set(l.level, (counts.get(l.level) ?? 0) + 1);
  return CEFR_LEVELS.flatMap((lv) => {
    const count = counts.get(lv) ?? 0;
    return count > 0 ? [{ info: LEVEL_CATALOG[lv], count }] : [];
  });
}

// ---- Trích xuất từ vựng quan trọng từ bài học khớp kho bộ từ (0 gọi AI, liên kết nội bộ 2 chiều) ----

export type ExtractedVocab = {
  word: string;
  gender: NounGender;
  plural: string;
  meaning: string;
  deckSlug: string;
  deckTitle: string;
  deckLevel: string;
  topic: string;
};

const STOP_WORDS = new Set([
  "aber", "alle", "allem", "allen", "aller", "alles", "also", "andere", "anderen", "anderer", "anders", "auch", "beim",
  "bin", "bist", "dabei", "dafür", "damit", "danach", "dann", "darf", "darüber", "darum", "dass", "dazu", "dein", "deine",
  "deinem", "deinen", "deiner", "denn", "deren", "dessen", "dich", "diese", "diesem", "diesen", "dieser", "dieses", "doch",
  "dort", "durch", "eigentlich", "ein", "eine", "einem", "einen", "einer", "eines", "einige", "einmal", "etwa", "etwas",
  "euch", "euer", "eure", "fast", "für", "ganz", "ganze", "gar", "geben", "gegen", "gehen", "genau", "gern", "gerne",
  "gibt", "groß", "große", "gut", "gute", "haben", "habt", "hast", "hatte", "hatten", "hätte", "heute", "hier", "hoch",
  "ihm", "ihn", "ihnen", "ihr", "ihre", "ihrem", "ihren", "ihrer", "immer", "jetzt", "kann", "kannst", "kein", "keine",
  "keinem", "keinen", "keiner", "klein", "kommen", "kommt", "können", "könnt", "konnte", "lassen", "leider", "machen",
  "macht", "man", "manche", "mehr", "mein", "meine", "meinem", "meinen", "meiner", "mich", "mir", "muss", "müssen",
  "musst", "nach", "natürlich", "nein", "neue", "neuen", "neuer", "nicht", "nichts", "noch", "nun", "nur", "oder", "ohne",
  "recht", "sagen", "sagt", "schon", "sehr", "sein", "seine", "seinem", "seinen", "seiner", "seit", "selbst", "sich",
  "sind", "so", "sogar", "soll", "sollen", "sollte", "sondern", "sonst", "über", "um", "und", "uns", "unser", "unsere",
  "unserem", "unseren", "unter", "viel", "viele", "vielen", "vielleicht", "vom", "von", "vor", "während", "wann", "war",
  "wäre", "waren", "warum", "was", "wegen", "weil", "weit", "weiter", "welche", "welchen", "welcher", "wenn", "wer",
  "werden", "werde", "wie", "wieder", "will", "willst", "wir", "wird", "wirklich", "wirst", "wo", "wohl", "wollen",
  "wollte", "wurde", "würde", "wurden", "zeit", "ziemlich", "zum", "zur", "zurück", "zusammen", "zwei", "zwischen",
]);

type DeckIndexEntry = ExtractedVocab & { priority: number };
let vocabIndexCache: Map<string, DeckIndexEntry[]> | null = null;

function deckRank(level: string): number {
  const i = (CEFR_LEVELS as readonly string[]).indexOf(level);
  return i < 0 ? 10 : i;
}

/** Dựng chỉ mục 1 lần từ 6 bộ từ đóng gói sẵn để trích từ quan trọng cho mỗi bài học tức thì (<1ms) */
function getVocabIndex(): Map<string, DeckIndexEntry[]> {
  if (vocabIndexCache) return vocabIndexCache;
  const idx = new Map<string, DeckIndexEntry[]>();
  const decks = listDecks()
    .map((s) => getDeck(s.slug))
    .filter((d): d is Deck => !!d);

  for (const deck of decks) {
    for (const w of deck.words) {
      const clean = w.word.trim();
      // Chỉ lập chỉ mục từ đơn ≥ 4 chữ (cụm từ cố định đã có riêng ở phần mẫu câu)
      if (!clean || /\s/.test(clean) || clean.length < 4) continue;
      const lower = clean.toLowerCase();
      if (STOP_WORDS.has(lower)) continue;
      const entry: DeckIndexEntry = {
        word: clean,
        gender: w.gender,
        plural: w.plural,
        meaning: w.meaning,
        deckSlug: deck.slug,
        deckTitle: deck.title,
        deckLevel: deck.level,
        topic: w.topic,
        priority: deckRank(deck.level),
      };
      const list = idx.get(lower);
      if (list) list.push(entry);
      else idx.set(lower, [entry]);
    }
  }
  vocabIndexCache = idx;
  return idx;
}

/** Trích 8–12 từ vựng đáng học xuất hiện thật trong phụ đề của bài, ưu tiên bộ từ đúng trình độ bài học */
export function extractLessonVocab(sentences: string[], lessonLevel: string, limit = 12): ExtractedVocab[] {
  const idx = getVocabIndex();
  const targetRank = deckRank(lessonLevel);
  const seen = new Map<string, { entry: DeckIndexEntry; freq: number; score: number }>();

  for (const sentence of sentences) {
    const tokens = sentence.match(/\p{L}{4,}/gu) ?? [];
    for (const tok of tokens) {
      const lower = tok.toLowerCase();
      if (STOP_WORDS.has(lower)) continue;
      const candidates = idx.get(lower);
      if (!candidates?.length) continue;

      const existing = seen.get(lower);
      if (existing) {
        existing.freq += 1;
        continue;
      }

      // Ưu tiên từ thuộc đúng trình độ bài học, rồi trình độ gần nhất; ưu tiên danh từ (có der/die/das)
      const best = [...candidates].sort((a, b) => {
        const da = Math.abs(a.priority - targetRank);
        const db = Math.abs(b.priority - targetRank);
        if (da !== db) return da - db;
        const na = a.gender === "der" || a.gender === "die" || a.gender === "das" ? 0 : 1;
        const nb = b.gender === "der" || b.gender === "die" || b.gender === "das" ? 0 : 1;
        return na - nb;
      })[0];

      // Nếu mục trong bộ từ là danh từ (viết hoa) mà token trong câu viết thường → bỏ để tránh ghép nhầm
      const isNoun = best.gender === "der" || best.gender === "die" || best.gender === "das";
      if (isNoun && tok[0] === tok[0].toLowerCase()) continue;

      const levelBonus = best.deckLevel === lessonLevel ? 30 : Math.abs(best.priority - targetRank) === 1 ? 15 : 0;
      const nounBonus = isNoun ? 10 : 0;
      const lengthBonus = Math.min(12, best.word.length);
      seen.set(lower, { entry: best, freq: 1, score: levelBonus + nounBonus + lengthBonus });
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.score + Math.min(6, b.freq * 2) - (a.score + Math.min(6, a.freq * 2)))
    .slice(0, limit)
    .map(({ entry }) => ({
      word: entry.word,
      gender: entry.gender,
      plural: entry.plural,
      meaning: entry.meaning,
      deckSlug: entry.deckSlug,
      deckTitle: entry.deckTitle,
      deckLevel: entry.deckLevel,
      topic: entry.topic,
    }));
}

// ---- Lấy bản dịch tiếng Việt & cụm từ cố định ĐÃ CACHE sẵn trong SQLite (không gọi AI lúc render trang) ----

const sha1 = (text: string) => createHash("sha1").update(text.trim()).digest("hex");

export type LessonPhraseItem = { base: string; meaning: string; sentence: string };
export type LessonTranscriptLine = { text: string; vi: string | null; start: number };

export function lessonStudyContent(segments: Segment[]): {
  sentences: LessonTranscriptLine[];
  phrases: LessonPhraseItem[];
  translatedCount: number;
} {
  const merged = mergeIntoSentences(segments);
  const texts = merged.map((s) => s.text.trim()).filter(Boolean);
  if (!texts.length) return { sentences: [], phrases: [], translatedCount: 0 };

  const viKeys = texts.map((t) => `vi:${sha1(t)}`);
  const phrKeys = texts.map((t) => `phr1:vi:${sha1(t)}`);
  const cached = getTranslations([...new Set([...viKeys, ...phrKeys])]);

  let translatedCount = 0;
  const sentences: LessonTranscriptLine[] = merged.map((s) => {
    const text = s.text.trim();
    const vi = text ? (cached.get(`vi:${sha1(text)}`) ?? null) : null;
    if (vi) translatedCount++;
    return { text, vi, start: s.start };
  });

  const phraseSeen = new Set<string>();
  const phrases: LessonPhraseItem[] = [];
  for (const s of sentences) {
    if (!s.text || phrases.length >= 10) break;
    const raw = cached.get(`phr1:vi:${sha1(s.text)}`);
    if (!raw) continue;
    try {
      const list = JSON.parse(raw) as Phrase[];
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        if (!p?.base || !p?.meaning) continue;
        const k = p.base.toLowerCase();
        if (phraseSeen.has(k)) continue;
        phraseSeen.add(k);
        phrases.push({ base: p.base, meaning: p.meaning, sentence: s.text });
        if (phrases.length >= 10) break;
      }
    } catch {}
  }

  return { sentences, phrases, translatedCount };
}

/** 4 bài học công khai liên quan (ưu tiên cùng trình độ, rồi trình độ kế tiếp) */
export function relatedLessons(currentId: number, level: string, limit = 4): LessonSummary[] {
  const all = listLessons().filter((l) => l.id !== currentId);
  const same = all.filter((l) => l.level === level);
  const info = parseCefrLevel(level) ? LEVEL_CATALOG[parseCefrLevel(level)!] : null;
  const next = info?.nextLevel ? all.filter((l) => l.level === info.nextLevel) : [];
  const rest = all.filter((l) => l.level !== level && l.level !== info?.nextLevel);
  return [...same, ...next, ...rest].slice(0, limit);
}

/** Bộ từ vựng tương ứng trình độ bài học (liên kết nội bộ sang kho Từ vựng) */
export function deckForLevel(level: string): { slug: string; title: string; wordCount: number } | null {
  const lv = parseCefrLevel(level);
  const slug = lv ? LEVEL_CATALOG[lv].deckSlug : null;
  if (!slug) return null;
  const d = getDeck(slug);
  return d ? { slug: d.slug, title: d.title, wordCount: d.words.length } : null;
}
