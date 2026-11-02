import "server-only";
import type { NounGender } from "./db";
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
  return {
    word: m ? m[2] : raw,
    gender,
    plural: w.plural?.trim() ?? "",
    meaning: w.meaning.trim(),
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

/** Chủ đề của bộ kèm số từ + số từ đã có trong sổ (saved: tập từ chữ thường trong sổ) */
export const deckTopics = (deck: Deck, saved: Set<string>) =>
  deck.topics.map((t) => {
    const words = deck.words.filter((w) => w.topic === t.id);
    return { ...t, wordCount: words.length, saved: words.filter((w) => saved.has(w.word.toLowerCase())).length };
  });

export const getDeck = (slug: string): Deck | null => DECKS.find((d) => d.slug === slug) ?? null;
