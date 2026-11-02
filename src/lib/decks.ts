import "server-only";
import {
  addDeckWords,
  deckSourcedVocab,
  getSetting,
  listDeckLearned,
  markDeckLearned,
  setSetting,
  vocabOverview,
  type NounGender,
} from "./db";
import aspekteNeuB2 from "@/content/decks/aspekte-neu-b2.json";
import goetheA1 from "@/content/decks/goethe-a1.json";
import goetheA2 from "@/content/decks/goethe-a2.json";
import goetheB1 from "@/content/decks/goethe-b1.json";
import nomenVerb from "@/content/decks/nomen-verb-verbindungen.json";
import wortschatzPflege from "@/content/decks/wortschatz-pflege.json";

/**
 * Kho bộ từ vựng (tab Từ vựng của app): mỗi bộ 1 file JSON trong src/content/decks/, build kèm server.
 * Thêm bộ mới: tạo file JSON (xem src/content/decks/README.md) rồi thêm 1 dòng vào RAW bên dưới.
 */
const RAW: RawDeck[] = [
  // Wortliste Goethe-Zertifikat A1 (Start Deutsch 1) / A2 / B1 — mỗi trình độ 1 bộ
  goetheA1,
  goetheA2,
  goetheB1,
  // Aspekte neu B2 (Klett, Kapitelwortschatz) — chủ đề theo 10 chương của giáo trình
  aspekteNeuB2,
  // Nomen-Verb-Verbindungen (Hans Witzlinger, „Deutsch – Aber Hallo!“) — chủ đề theo vần A–Z
  nomenVerb,
  // Wortschatz Deutsch Pflege (Sandra Hohmann) — từ vựng điều dưỡng, chủ đề theo vần A–Z
  wortschatzPflege,
];

type RawDeck = {
  slug: string;
  title: string;
  description?: string;
  category: string; // nhóm hiện thành 1 mục trên app ("Trình độ A1", "Goethe-Zertifikat"…)
  level?: string;
  cover?: string; // "/decks/<file>" trong public/, hoặc URL đầy đủ — không có thì app tự vẽ bìa
  order?: number;
  topics?: DeckTopic[]; // có thì trang bộ từ hiện danh sách chủ đề, bấm vào mới ra từ
  words: { word: string; meaning: string; example?: string; plural?: string; topic?: string; image?: string }[];
};

/** Chủ đề trong 1 bộ ("an-uong" · "Ăn uống" · "🍽️") */
export type DeckTopic = { id: string; title: string; icon: string };

export type DeckWord = {
  key: string; // khoá mục trong bộ — phân biệt từ đồng âm ("die Bank" ngân hàng / ghế băng)
  word: string; // không kèm mạo từ ("Hund")
  gender: NounGender; // mạo từ lấy từ "der Hund" · '-' = chắc chắn không phải danh từ · '' = để AI xác định sau
  plural: string;
  meaning: string;
  example: string;
  topic: string; // id chủ đề ("" = bộ không chia chủ đề)
  image: string | null; // hình minh hoạ "/emoji/<mã>.webp" (Fluent Emoji 3D trong public/) — null: dùng biểu tượng chủ đề
};
export type Deck = {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  cover: string | null;
  order: number;
  topics: DeckTopic[];
  words: DeckWord[];
};
export type DeckSummary = Omit<Deck, "words" | "topics"> & { wordCount: number; topicCount: number };

function toWord(w: RawDeck["words"][number]): DeckWord {
  const raw = w.word.trim();
  // "der Hund", "die Pommes frites" — phần sau mạo từ viết hoa, không phải cụm liệt kê ("der, die, das") / ngày tháng ("der zwanzigste …")
  const m = raw.match(/^(der|die|das) (\p{Lu}[^,/()]*)$/u);
  // Danh từ tiếng Đức luôn viết hoa → viết thường / nhiều từ thì không phải danh từ
  const gender: NounGender = m ? (m[1] as NounGender) : /\s/.test(raw) || raw[0] !== raw[0].toUpperCase() ? "-" : "";
  const word = m ? m[2] : raw;
  const meaning = w.meaning.trim();
  return {
    key: `${gender}|${word}|${meaning}`,
    word,
    gender,
    plural: w.plural?.trim() ?? "",
    meaning,
    example: w.example?.trim() ?? "",
    topic: w.topic ?? "",
    image: w.image ?? null,
  };
}

const DECKS: Deck[] = RAW.map((d) => ({
  slug: d.slug,
  title: d.title,
  description: d.description ?? "",
  category: d.category,
  level: d.level ?? "",
  cover: d.cover ?? null,
  order: d.order ?? 0,
  topics: d.topics ?? [],
  words: d.words.map(toWord),
})).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export const listDecks = (): DeckSummary[] =>
  DECKS.map(({ words, topics, ...d }) => ({ ...d, wordCount: words.length, topicCount: topics.length }));

export const getDeck = (slug: string): Deck | null => DECKS.find((d) => d.slug === slug) ?? null;

// ---- Tiến độ của từng người: "có trong sổ" (saved) và "đã học trong bộ này" (learned) là 2 việc khác nhau ----

/** Từ cùng cách viết (không phân biệt hoa thường) trong từng bộ */
const GROUPS = new Map(
  DECKS.map((d) => {
    const groups = new Map<string, DeckWord[]>();
    for (const w of d.words) (groups.get(w.word.toLowerCase()) ?? groups.set(w.word.toLowerCase(), []).get(w.word.toLowerCase())!).push(w);
    return [d.slug, groups];
  }),
);
/** Các mục khác trong bộ có cùng cách viết */
const siblings = (deck: Deck, w: DeckWord) => (GROUPS.get(deck.slug)?.get(w.word.toLowerCase()) ?? []).filter((s) => s.key !== w.key);
const hasMeaning = (note: string, meaning: string) => note.toLowerCase().includes(meaning.toLowerCase());
const isArticle = (g: NounGender) => g === "der" || g === "die" || g === "das";

/** Mục này đã có trong sổ? "essen" / "Essen" cùng bộ là 2 từ khác nhau; từ đồng âm thì xem nghĩa của mục đã có nghĩa này chưa */
function inNotes(deck: Deck, w: DeckWord, notes: Map<string, string>): boolean {
  const sibs = siblings(deck, w);
  const note = sibs.some((s) => s.word !== w.word)
    ? notes.get(w.word)
    : (notes.get(w.word) ?? notes.get(w.word[0].toLowerCase() + w.word.slice(1)) ?? notes.get(w.word[0].toUpperCase() + w.word.slice(1)));
  if (note === undefined) return false;
  return !sibs.some((s) => s.word === w.word && s.meaning !== w.meaning) || hasMeaning(note, w.meaning);
}

/** Nghĩa của mục sổ từ sau khi thêm mục này: từ đồng âm gộp nghĩa ("ngân hàng; ghế băng"), khác mạo từ thì ghi rõ từng mạo từ */
function mergedMeaning(deck: Deck, w: DeckWord, current: string): string {
  const others = siblings(deck, w).filter((s) => s.word === w.word && s.meaning !== w.meaning);
  if (!others.length) return current || w.meaning;
  const label = (x: DeckWord, m: string) => (others.some((s) => s.gender !== w.gender) && isArticle(x.gender) ? `${x.gender} ${x.word}: ${m}` : m);
  if (!current) return label(w, w.meaning);
  if (hasMeaning(current, w.meaning)) return current;
  const same = others.find((s) => s.meaning === current);
  return `${same ? label(same, current) : current}; ${label(w, w.meaning)}`;
}

const BACKFILL_KEY = "deck-learned-backfill";
let backfilled = false;
/** Lần đầu: mục đã thêm từ 1 bộ trước khi có bảng deck_learned → coi là đã học trong bộ đó (giữ tiến độ cũ) */
function backfillLearned() {
  if (backfilled) return;
  backfilled = true;
  if (getSetting<boolean>(BACKFILL_KEY)) return;
  const byOwner = new Map<string, Map<string, string>>();
  for (const r of deckSourcedVocab()) {
    const k = `${r.user_id}|${r.source_title}`;
    (byOwner.get(k) ?? byOwner.set(k, new Map()).get(k)!).set(r.word, r.meaning);
  }
  for (const [k, notes] of byOwner) {
    const at = k.indexOf("|");
    const deck = DECKS.find((d) => d.title === k.slice(at + 1));
    if (deck) markDeckLearned(Number(k.slice(0, at)), deck.slug, deck.words.filter((w) => inNotes(deck, w, notes)).map((w) => w.key));
  }
  setSetting(BACKFILL_KEY, true);
}

export type DeckMarks = { notes: Map<string, string>; learned: Map<string, Set<string>> };
const NO_MARKS: DeckMarks = { notes: new Map(), learned: new Map() };

/** Dữ liệu tiến độ của 1 người (khách: rỗng) — tải 1 lần rồi dùng cho nhiều bộ */
export function deckMarks(userId: number | null): DeckMarks {
  if (userId === null) return NO_MARKS;
  backfillLearned();
  return { notes: vocabOverview(userId).notes, learned: listDeckLearned(userId) };
}

/** Từ của bộ kèm 2 cờ tiến độ */
export const markWord = (deck: Deck, w: DeckWord, m: DeckMarks) => ({
  ...w,
  saved: inNotes(deck, w, m.notes),
  learned: !!m.learned.get(deck.slug)?.has(w.key),
});

const countOf = (deck: Deck, words: DeckWord[], m: DeckMarks) => ({
  saved: words.filter((w) => inNotes(deck, w, m.notes)).length,
  learned: words.filter((w) => m.learned.get(deck.slug)?.has(w.key)).length,
});
export const deckCounts = (deck: Deck, m: DeckMarks) => countOf(deck, deck.words, m);

/** Chủ đề của bộ kèm số từ + số từ đã có trong sổ + số từ đã học */
export const deckTopics = (deck: Deck, m: DeckMarks) =>
  deck.topics.map((t) => {
    const words = deck.words.filter((w) => w.topic === t.id);
    return { ...t, wordCount: words.length, ...countOf(deck, words, m) };
  });

/** Thêm các mục vào sổ để ôn; learn = học xong ở màn học (ghi tiến độ của bộ). → số mục mới thêm */
export function addDeckEntries(userId: number, deck: Deck, words: DeckWord[], learn = false): number {
  const { notes } = vocabOverview(userId);
  const added = addDeckWords(
    userId,
    words.map((w) => ({
      word: w.word,
      gender: w.gender,
      plural: w.plural,
      example: w.example,
      exactCase: siblings(deck, w).some((s) => s.word !== w.word),
      isNew: !inNotes(deck, w, notes),
      mergeMeaning: (current) => mergedMeaning(deck, w, current),
    })),
    deck.title,
  );
  if (learn) markDeckLearned(userId, deck.slug, words.map((w) => w.key));
  return added;
}
