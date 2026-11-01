import "server-only";
import type { NounGender } from "./db";
import a1ChaoHoi from "@/content/decks/a1-chao-hoi.json";
import a1GiaDinh from "@/content/decks/a1-gia-dinh.json";
import goetheA1A from "@/content/decks/goethe-a1-a.json";
import goetheA1BD from "@/content/decks/goethe-a1-b-d.json";
import goetheA1EG from "@/content/decks/goethe-a1-e-g.json";
import goetheA1HK from "@/content/decks/goethe-a1-h-k.json";
import goetheA1LO from "@/content/decks/goethe-a1-l-o.json";
import goetheA1PS from "@/content/decks/goethe-a1-p-s.json";
import goetheA1TZ from "@/content/decks/goethe-a1-t-z.json";
import goetheA2NhomChuDe from "@/content/decks/goethe-a2-nhom-chu-de.json";
import goetheA2A from "@/content/decks/goethe-a2-a.json";
import goetheA2BC from "@/content/decks/goethe-a2-b-c.json";
import goetheA2DE from "@/content/decks/goethe-a2-d-e.json";
import goetheA2FG from "@/content/decks/goethe-a2-f-g.json";
import goetheA2HJ from "@/content/decks/goethe-a2-h-j.json";
import goetheA2KL from "@/content/decks/goethe-a2-k-l.json";
import goetheA2MO from "@/content/decks/goethe-a2-m-o.json";
import goetheA2PR from "@/content/decks/goethe-a2-p-r.json";
import goetheA2S from "@/content/decks/goethe-a2-s.json";
import goetheA2TV from "@/content/decks/goethe-a2-t-v.json";
import goetheA2WZ from "@/content/decks/goethe-a2-w-z.json";

/**
 * Kho bộ từ vựng (tab Từ vựng của app): mỗi bộ 1 file JSON trong src/content/decks/, build kèm server.
 * Thêm bộ mới: tạo file JSON (xem src/content/decks/README.md) rồi thêm 1 dòng vào RAW bên dưới.
 */
const RAW: RawDeck[] = [
  a1ChaoHoi,
  a1GiaDinh,
  // Wortliste Goethe-Zertifikat A1 (Start Deutsch 1), chia theo vần
  goetheA1A,
  goetheA1BD,
  goetheA1EG,
  goetheA1HK,
  goetheA1LO,
  goetheA1PS,
  goetheA1TZ,
  // Wortliste Goethe-Zertifikat A2: nhóm chủ đề + chia theo vần
  goetheA2NhomChuDe,
  goetheA2A,
  goetheA2BC,
  goetheA2DE,
  goetheA2FG,
  goetheA2HJ,
  goetheA2KL,
  goetheA2MO,
  goetheA2PR,
  goetheA2S,
  goetheA2TV,
  goetheA2WZ,
];

type RawDeck = {
  slug: string;
  title: string;
  description?: string;
  category: string; // nhóm hiện thành 1 mục trên app ("Trình độ A1", "Goethe-Zertifikat"…)
  level?: string;
  cover?: string; // "/decks/<file>" trong public/, hoặc URL đầy đủ — không có thì app tự vẽ bìa
  order?: number;
  words: { word: string; meaning: string; example?: string; plural?: string }[];
};

export type DeckWord = {
  word: string; // không kèm mạo từ ("Hund")
  gender: NounGender; // mạo từ lấy từ "der Hund" · '-' = chắc chắn không phải danh từ · '' = để AI xác định sau
  plural: string;
  meaning: string;
  example: string;
};
export type Deck = {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  cover: string | null;
  order: number;
  words: DeckWord[];
};
export type DeckSummary = Omit<Deck, "words"> & { wordCount: number };

function toWord(w: RawDeck["words"][number]): DeckWord {
  const raw = w.word.trim();
  const m = raw.match(/^(der|die|das) (\S+)$/);
  // Danh từ tiếng Đức luôn viết hoa → viết thường / nhiều từ thì không phải danh từ
  const gender: NounGender = m ? (m[1] as NounGender) : /\s/.test(raw) || raw[0] !== raw[0].toUpperCase() ? "-" : "";
  return { word: m ? m[2] : raw, gender, plural: w.plural?.trim() ?? "", meaning: w.meaning.trim(), example: w.example?.trim() ?? "" };
}

const DECKS: Deck[] = RAW.map((d) => ({
  slug: d.slug,
  title: d.title,
  description: d.description ?? "",
  category: d.category,
  level: d.level ?? "",
  cover: d.cover ?? null,
  order: d.order ?? 0,
  words: d.words.map(toWord),
})).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export const listDecks = (): DeckSummary[] => DECKS.map(({ words, ...d }) => ({ ...d, wordCount: words.length }));

export const getDeck = (slug: string): Deck | null => DECKS.find((d) => d.slug === slug) ?? null;
