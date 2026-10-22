import "server-only";
import { createHash } from "node:crypto";
import { getTranslations, saveTranslations } from "./db";
import { chatJson } from "./translate";

/**
 * Dịch nghĩa 1 từ tiếng Đức theo ngữ cảnh câu, bằng lời nói hằng ngày (tiếng Việt / Anh / Đức đơn giản — theo giao diện app).
 * Cần nghĩa chuẩn, sát → ChatGPT trước, rồi Groq lớn, Groq nhỏ (dự phòng khi cái trước lỗi).
 * Kết quả lưu trong kho bản dịch (bảng translations, khoá "wordm:<lang>:…") → mỗi từ trong mỗi câu chỉ hỏi AI 1 lần.
 */

export type WordLang = "vi" | "en" | "de";
export type WordInfo = { word: string; meaning: string };

const prompt = (lang: WordLang) =>
  lang === "de"
    ? 'Du hilfst Deutschlernenden. Du bekommst JSON {"word", "sentence"}. ' +
      "Gib die genaue Bedeutung des Wortes in GENAU diesem Satz an. Ist es Teil einer Redewendung, festen Wendung oder eines trennbaren Verbs, " +
      "erkläre die ganze Wendung (z. B. \"keinen Bock haben\" → \"keine Lust haben\"), nie wörtlich — " +
      "als treffendes, alltagssprachliches Synonym oder ganz kurze Umschreibung (1–4 Wörter). " +
      "NUR dieses Wort (bzw. die kürzeste Wendung, zu der es gehört) — keine anderen Wörter des Satzes. " +
      'Nicht das Wort selbst wiederholen, keine Erklärung. Antworte NUR mit JSON {"meaning": "…"}.'
    : `You help learners of German. Input JSON {"word", "sentence"}. ` +
      `Give the precise meaning of the word in EXACTLY this sentence, in ${lang === "vi" ? "Vietnamese" : "English"}. ` +
      `If the word is part of an idiom, fixed phrase or separable verb in this sentence, give the meaning of that whole phrase ` +
      `(e.g. "keinen Bock haben" → "not in the mood", "Bescheid sagen" → "let … know"), never a literal word-by-word meaning. ` +
      `Must be accurate and faithful, worded the way people naturally say it in everyday speech — not stiff dictionary wording. ` +
      `Translate ONLY that word (or the shortest idiom it belongs to) — never other words of the sentence. 1–4 words, no explanations. ` +
      `Reply ONLY with JSON {"meaning": "…"}.`;

const isMeaning = (x: unknown): x is { meaning: string } => {
  const m = (x as { meaning?: unknown })?.meaning;
  return typeof m === "string" && !!m.trim();
};

export async function translateWord(word: string, sentence: string, lang: WordLang): Promise<WordInfo> {
  const key = `wordm:${lang}:` + createHash("sha1").update(`${word.toLowerCase()}|${sentence.trim()}`).digest("hex");
  const cached = getTranslations([key]).get(key);
  if (cached) return { word, meaning: cached };

  const { meaning, provider } = await chatJson(prompt(lang), { word, sentence }, isMeaning, { prefer: "openai" });
  const m = meaning.trim();
  saveTranslations([{ key, text: `${word} | ${sentence}`, translation: m, provider }]);
  return { word, meaning: m };
}

/** Chi tiết cho popup: dạng từ điển, loại từ, ghi chú ngữ pháp, giải thích ngắn, ví dụ đời thường */
export type WordDetail = {
  lemma: string; // "die Aussprache", "sich verabschieden"
  pos: string; // loại từ (theo ngôn ngữ giao diện)
  grammar: string; // "Plural: die Aussprachen" / "Infinitiv: verabschieden, Partizip II: verabschiedet"
  explanation: string; // 1–2 câu
  examples: { de: string; tr: string }[]; // từ cần học được bọc **…**; tr = "" khi giao diện tiếng Đức
  // Các nghĩa phổ biến của từ gốc (kiểu từ điển): nghĩa · cấu trúc dùng · ví dụ. current = nghĩa trong câu đang học
  senses: { meaning: string; use: string; de: string; tr: string; current: boolean }[];
  forms: { form: string; note: string }[]; // các dạng quan trọng: "stellt an" — chia ngôi er/sie/es
  tip: string; // mẹo nhớ ngắn ("" nếu không có)
  cues: { cue: string; meaning: string }[]; // từ đi kèm → nghĩa: "Mitarbeiter anstellen" → tuyển dụng
  idiom: { de: string; note: string } | null; // câu nói hay gặp với từ này + sắc thái
};

const detailPrompt = (lang: WordLang) => {
  const L = lang === "vi" ? "Vietnamese (tiếng Việt)" : lang === "en" ? "English" : "simple German (A2)";
  return (
    `You help learners of German. Input JSON {"word", "sentence"}: a word and the sentence it appears in. ` +
    `Reply ONLY with JSON {"lemma", "pos", "grammar", "explanation", "examples", "senses", "forms", "tip", "cues", "idiom"}.\n` +
    `OUTPUT LANGUAGE for "pos", "explanation", "tip", every "meaning", "note" and "translation": ${L}. Never use any other language there.\n` +
    `- lemma: German dictionary form (nouns with article, e.g. "die Aussprache"; reflexive/separable verbs as used here, e.g. "sich verabschieden", "anfangen").\n` +
    `- pos: part of speech (in ${L}).\n` +
    `- grammar: one short line of key German forms (nouns: plural; verbs: ALWAYS start with the infinitive, then Präteritum, Partizip II, auxiliary — e.g. "Infinitiv: betrachten, Präteritum: betrachtete, Partizip II: betrachtet, Hilfsverb: haben"; adjectives: comparative), or "".\n` +
    `- explanation: 1–2 short sentences written in ${L}: what the word means in this sentence and how it is typically used. Accurate, plain everyday language.\n` +
    `- examples: 4 short, natural everyday German sentences using the word with the same meaning as in the sentence (vary the forms). ` +
    `Wrap the target word form in **double asterisks**. ` +
    (lang === "de"
      ? `Each item: {"de": "<German sentence>"}.`
      : `Each item: {"de": "<German sentence>", "translation": "<natural translation in ${L}>"}.`) +
    `\n- senses: the 1–5 most common meanings of the lemma in everyday German, like a good learner's dictionary — the meaning used in this sentence FIRST with "current": true, the others "current": false. ` +
    `Each item: {"meaning": "<short meaning in ${L}, 1–5 words>", "use": "<typical German pattern with this meaning, e.g. \"jemanden anstellen\", \"sich anstellen\", \"etwas anstellen\">", ` +
    `"de": "<short natural German example, target word form in **double asterisks**>"` +
    (lang === "de" ? `, "current": <bool>}.` : `, "translation": "<translation in ${L}>", "current": <bool>}.`) +
    ` Only real, common meanings; if the word has just one, give 1 item.` +
    `\n- forms: 3–6 important forms a learner meets, each {"form": "<German form, e.g. \"stellt an\", \"stellte an\", \"hat angestellt\", \"sich anstellen\">", "note": "<when it is used, in ${L}, e.g. person/tense>"}. For nouns: singular/plural/cases that matter; for adjectives: comparison. [] if not useful.` +
    `\n- tip: one short memory tip in ${L} that helps tell the meanings apart or remember the word (e.g. "look at the word that comes with it"), or "".` +
    `\n- cues: 0–4 typical word combinations that signal a meaning, each {"cue": "<German combination>", "meaning": "<meaning in ${L}>"}.` +
    `\n- idiom: a very common everyday expression or sentence with this word that natives really say, {"de": "<German>", "note": "<meaning and tone in ${L}>"}, or null if none.`
  );
};

const isDetail = (x: unknown): x is WordDetail => {
  const o = x as Record<string, unknown>;
  return (
    !!o &&
    typeof o.lemma === "string" &&
    typeof o.pos === "string" &&
    typeof o.explanation === "string" &&
    Array.isArray(o.examples) &&
    o.examples.length > 0 &&
    o.examples.every((e) => e && typeof (e as { de?: unknown }).de === "string")
  );
};

export async function wordDetail(word: string, sentence: string, lang: WordLang): Promise<WordDetail> {
  const key = `wordd:${lang}:` + createHash("sha1").update(`${word.toLowerCase()}|${sentence.trim()}`).digest("hex");
  const cached = getTranslations([key]).get(key);
  if (cached) {
    try {
      const d = JSON.parse(cached) as WordDetail;
      if (Array.isArray(d.senses) && Array.isArray(d.forms)) return withInfinitive(d); // bản lưu cũ thiếu phần mới → hỏi AI lại 1 lần
    } catch {}
  }
  const { provider, ...r } = await chatJson(detailPrompt(lang), { word, sentence }, isDetail, { prefer: "large" });
  const d: WordDetail = {
    lemma: r.lemma.trim(),
    pos: r.pos.trim(),
    grammar: typeof r.grammar === "string" ? r.grammar.trim() : "",
    explanation: r.explanation.trim(),
    examples: r.examples.slice(0, 5).map((e) => {
      const tr = (e as { translation?: unknown }).translation;
      return { de: String(e.de).trim(), tr: lang !== "de" && typeof tr === "string" ? tr.trim() : "" };
    }),
    ...cleanExtras(r as Record<string, unknown>, lang),
  };
  saveTranslations([{ key, text: `${word} | ${sentence}`, translation: JSON.stringify(d), provider }]);
  return withInfinitive(d);
}

/** Lọc danh sách nghĩa AI trả về: đủ trường, tối đa 5, nghĩa trong câu đứng đầu */
function cleanSenses(raw: unknown, lang: WordLang): WordDetail["senses"] {
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const out = raw
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { meaning: str(o.meaning), use: str(o.use), de: str(o.de), tr: lang === "de" ? "" : str(o.translation), current: o.current === true };
    })
    .filter((s) => s.meaning && s.de)
    .slice(0, 5);
  return out.sort((a, b) => Number(b.current) - Number(a.current));
}

const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Các phần thêm (nghĩa · dạng · mẹo nhớ · từ đi kèm · câu hay gặp) — thiếu / sai kiểu thì bỏ qua phần đó */
function cleanExtras(r: Record<string, unknown>, lang: WordLang): Pick<WordDetail, "senses" | "forms" | "tip" | "cues" | "idiom"> {
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]).filter((x) => x && typeof x === "object") : []);
  const idiom = r.idiom as Record<string, unknown> | null;
  return {
    senses: cleanSenses(r.senses, lang),
    forms: list(r.forms)
      .map((o) => ({ form: txt(o.form), note: txt(o.note) }))
      .filter((f) => f.form)
      .slice(0, 6),
    tip: txt(r.tip),
    cues: list(r.cues)
      .map((o) => ({ cue: txt(o.cue), meaning: txt(o.meaning) }))
      .filter((c) => c.cue && c.meaning)
      .slice(0, 4),
    idiom: idiom && typeof idiom === "object" && txt(idiom.de) ? { de: txt(idiom.de), note: txt(idiom.note) } : null,
  };
}

/** Động từ luôn có "Infinitiv: …" đầu dòng ngữ pháp — kể cả bản đã lưu trước khi prompt yêu cầu (AI quên thì lấy lemma) */
function withInfinitive(d: WordDetail): WordDetail {
  if (!/Partizip|Präteritum/i.test(d.grammar) || /Infinitiv/i.test(d.grammar)) return d;
  return { ...d, grammar: `Infinitiv: ${d.lemma}, ${d.grammar}` };
}
