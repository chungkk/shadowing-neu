import "server-only";
import { createHash } from "node:crypto";
import { getTranslations, saveTranslations } from "./db";

/**
 * Dịch câu tiếng Đức → tiếng Việt, rẻ nhất có thể:
 *   1. Kho bản dịch trong SQLite (mỗi câu chỉ dịch 1 lần, dùng chung mọi bài / người học)
 *   2. Mô hình nhỏ trên Groq (dùng chung key với Whisper)
 *   3. Câu nào mô hình nhỏ chưa dịch (trả lại nguyên tiếng Đức) → mô hình lớn hơn trên Groq
 *   4. ChatGPT (OpenAI) làm dự phòng cuối
 * Cả hai đều lỗi → ném lỗi; giao diện vẫn còn link Google Translate.
 *
 * Biến môi trường (tuỳ chọn):
 * - TRANSLATE_MODEL           mô hình Groq (mặc định "openai/gpt-oss-20b")
 * - TRANSLATE_RETRY_MODEL     mô hình Groq dịch lại câu bị lỗi (mặc định "openai/gpt-oss-120b")
 * - DUB_TRANSLATE_MODEL       mô hình Groq riêng cho thuyết minh (mặc định dùng TRANSLATE_RETRY_MODEL = "openai/gpt-oss-120b")
 * - DUB_TRANSLATE_PREFER      đặt "openai" nếu muốn thuyết minh ưu tiên OpenAI trước Groq 120b
 * - TRANSLATE_API_URL/KEY     endpoint chat completions chính (mặc định suy ra từ TRANSCRIBE_API_URL/KEY)
 * - OPENAI_API_KEY            bật ChatGPT dự phòng
 * - OPENAI_TRANSLATE_MODEL    mô hình ChatGPT (mặc định "gpt-5-mini")
 */

type Provider = { name: string; url: string; key: string; model: string; extra?: object };

function providers(): Provider[] {
  const list: Provider[] = [];
  const groqKey = process.env.TRANSLATE_API_KEY ?? process.env.TRANSCRIBE_API_KEY;
  const groqUrl =
    process.env.TRANSLATE_API_URL ??
    process.env.TRANSCRIBE_API_URL?.replace(/\/audio\/transcriptions$/, "/chat/completions") ??
    "https://api.groq.com/openai/v1/chat/completions";
  if (groqKey && !groqUrl.includes("api.openai.com")) {
    for (const model of new Set([
      process.env.TRANSLATE_MODEL ?? "openai/gpt-oss-20b",
      process.env.TRANSLATE_RETRY_MODEL ?? "openai/gpt-oss-120b",
    ])) {
      list.push({
        name: `groq:${model}`,
        url: groqUrl,
        key: groqKey,
        model,
        extra: { reasoning_effort: "low", temperature: 0.2 },
      });
    }
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const openaiModel = process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-5-mini";
    list.push({
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: openaiModel,
      // Mô hình suy luận (gpt-5*, o*) mặc định nghĩ lâu → dễ quá 45s; dịch phụ đề không cần
      extra: /^(gpt-5|o\d)/.test(openaiModel) ? { reasoning_effort: "low" } : undefined,
    });
  }
  return list;
}

export const translationEnabled = () => providers().length > 0;

const PROMPT =
  "Bạn là người dịch phụ đề tiếng Đức sang tiếng Việt cho người học tiếng Đức. " +
  'Nhận JSON {"s": {"1": dòng 1, "2": dòng 2, …}} là các dòng phụ đề liên tiếp trong một video. ' +
  "Dịch từng dòng sang tiếng Việt tự nhiên, sát nghĩa, dựa vào ngữ cảnh các dòng xung quanh. " +
  "Một câu có thể bị ngắt sang nhiều dòng: khi đó mỗi dòng chỉ dịch phần chữ của chính nó (bản dịch cũng dở dang theo), TUYỆT ĐỐI không gộp nội dung dòng sau vào dòng trước. " +
  'Trả về đúng JSON {"t": {"1": bản dịch dòng 1, "2": bản dịch dòng 2, …}}: đủ mọi khóa có trong đầu vào, khóa nào dịch đúng dòng có khóa đó, không giải thích.';

const BATCH = 25; // số câu mỗi lần gọi AI

export const DUB_SKIP = "[SKIP]";
export const isDubSkip = (s: string) => /^\[skip\]$/i.test(s.trim());

const VI_CHARS = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
// Ký tự chỉ có trong tiếng Việt (không xuất hiện trong Pháp/Tây Ban Nha/Ý/Bồ Đào Nha/Đức)
const VI_EXCLUSIVE_CHARS = /[ăđơưảạằắẳẵặầấẩẫậẻẽẹềếểễệỉĩịỏọồốổỗộờớởỡợủũụừứửữựỳỷỹỵ]/i;
const NON_LATIN_SCRIPT =
  /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}|\p{Script=Cyrillic}|\p{Script=Arabic}|\p{Script=Thai}/gu;
// Từ tiếng Việt phổ biến không có dấu thanh (tránh trùng stopword Anh/Đức) để không loại nhầm câu ngắn như "Anh tin em.", "Em xin anh.", "25 euro."
const VI_PLAIN_WORDS = new Set([
  "anh", "em", "toi", "ta", "cho", "xem", "tin", "xin", "sao", "ai", "ba", "cha", "mua", "hoa", "nghe",
  "nhanh", "xong", "quen", "nha", "nhau", "nhung", "ngay", "nguoi", "thay", "thua", "xanh", "trang", "cao",
  "lau", "sau", "truoc", "tren", "trong", "ngoai", "rieng", "chung", "them", "nhu", "voi", "hoac", "nen",
  "thi", "khong", "cung", "dang", "moi", "mot", "hai", "bon", "nam", "bay", "tam", "chin", "muoi", "tram",
  "nghin", "trieu", "phan", "euro", "dola", "xe", "ga", "ca", "ra", "con", "hay", "sai", "tay", "nay", "kia",
]);
// Từ tiếng Việt có dấu phổ biến (dùng để phân biệt câu có dấu dùng chung Pháp/TBN như "Chào!", "Vâng, thế à?")
const VI_COMMON_WORDS = new Set([
  ...VI_PLAIN_WORDS,
  "chào", "và", "là", "của", "có", "này", "đó", "vì", "nhưng", "rất", "quá", "thế", "gì", "đây",
  "vâng", "rồi", "nhé", "bạn", "mình", "chúng", "họ", "nó", "sẽ", "đã", "phải", "muốn", "cần", "biết",
  "làm", "đi", "đến", "về", "nói", "hỏi", "tốt", "đúng", "mới", "nhiều", "ít", "mọi", "tất", "cả",
  "cũng", "vẫn", "chỉ", "hơn", "nhất", "lại", "nữa", "thì", "mà", "nếu", "khi", "để", "từ", "được",
  "bị", "với", "trên", "dưới", "trước", "sau", "không", "đang", "những", "các", "một", "hai", "ồ", "à", "ừ",
]);

// Từ/thán từ/đơn vị quốc tế dùng trực tiếp trong tiếng Việt ngay cả khi giữ nguyên
const UNIVERSAL_SHORT_WORDS = new Set([
  "ok", "okay", "oh", "ah", "aha", "wow", "hey", "hi", "hmm", "hm", "mhm", "uh", "um",
  "haha", "hahaha", "hehe", "oops", "yay", "woah", "whoa", "bravo", "bingo",
  "euro", "cent", "km", "kg", "cm", "mm", "ml", "gb", "mb", "tb",
  "pro", "max", "mini", "plus", "ultra", "live", "online", "app", "pdf",
  "ai", "tv", "dj", "mc", "vip", "ceo", "usa", "eu", "uk", "un", "nato",
]);

// Từ phổ biến 1–2 từ tiếng Đức / Anh bắt buộc phải dịch sang tiếng Việt (không được chép nguyên văn)
const UNTRANSLATED_SHORT_WORDS = new Set([
  "hallo", "danke", "bitte", "ja", "nein", "genau", "gut", "klar", "warum", "was", "wie", "wer", "wo", "wann",
  "tschüss", "tschüß", "servus", "moin", "super", "toll", "richtig", "falsch", "warte", "stopp", "los", "weiter",
  "fertig", "echt", "wirklich", "natürlich", "vielleicht", "sicher", "stimmt", "krass", "schade", "leider", "moment",
  "achtung", "vorsicht", "hilfe", "entschuldigung", "verzeihung", "willkommen", "vielen", "guten", "gute", "alles",
  "kein", "keine", "nicht", "nichts", "mehr", "schon", "noch", "jetzt", "hier", "dort", "heute", "morgen", "gestern",
  "immer", "nie", "sehr", "viel", "wenig", "leute", "freunde", "bis", "bald", "dank", "tag", "abend", "nacht", "problem",
  "hello", "thanks", "thank", "please", "sorry", "excuse", "yes", "no", "yeah", "yep", "nope", "sure", "right", "wrong",
  "true", "false", "really", "actually", "maybe", "wait", "stop", "go", "come", "look", "listen", "watch", "ready",
  "done", "good", "great", "nice", "awesome", "amazing", "perfect", "cool", "fine", "well", "what", "why", "how", "who",
  "where", "when", "welcome", "goodbye", "bye", "morning", "evening", "night", "course", "way", "people", "guys",
  "friends", "everyone", "everybody", "see", "you", "me", "him", "her", "them", "this", "that", "here", "there", "now",
  "today", "tomorrow", "never", "always", "again", "more", "less", "enough", "help", "careful", "attention",
]);

/**
 * Bản dịch có thật là tiếng Việt không? Mô hình nhỏ đôi khi chép lại nguyên câu gốc hoặc dịch sang tiếng Anh.
 * - Với chữ CJK / không phải Latin (Nhật, Trung, Hàn, Nga…): kiểm tra tỷ lệ chữ gốc và sự thay đổi.
 * - Với câu Latin ngắn (≤ 2 từ): chỉ giữ nguyên thán từ quốc tế ("Okay.", "Wow!") hoặc tên riêng/thương hiệu ("Berlin.", "Elon Musk.");
 *   từ chào hỏi/câu ngắn phổ thông ("Good morning.", "Vielen Dank.", "Warum nicht?") bị chép lại sẽ bị loại để dịch lại.
 * - Với câu tiếng Việt hợp lệ nhưng không có dấu thanh ("Anh tin em.", "25 euro."): vẫn chấp nhận.
 */
export function looksTranslated(source: string, translation: string): boolean {
  const t = translation.trim();
  if (!t) return false;
  if (isDubSkip(t)) return true;
  // Câu chỉ có số / ký hiệu ("10, 9, 8", "2024, 2025, 2026") giữ nguyên vẫn hợp lệ
  if (!/\p{L}/u.test(source)) return true;

  const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

  const srcNonLatin = (source.match(NON_LATIN_SCRIPT) ?? []).length;
  const outNonLatin = (t.match(NON_LATIN_SCRIPT) ?? []).length;
  const outLetters = (t.match(/\p{L}/gu) ?? []).length;
  const srcLetters = source.match(/\p{L}/gu) ?? [];
  const isAllCapsSource =
    srcLetters.length >= 4 && source === source.toUpperCase() && source !== source.toLowerCase();

  // Bản dịch vẫn còn nhiều ký tự ngoại ngữ (Nhật/Trung/Hàn/Nga/Ả Rập/Thái) → chưa dịch
  if (outNonLatin > 0 && outLetters > 0 && outNonLatin / outLetters > 0.2) return false;

  if (srcNonLatin > 0) {
    if (norm(t) === norm(source)) return false;
    // Cụm CJK rất ngắn (tên riêng 1–4 chữ, vd "東京" → "Tokyo") sau khi bỏ hết ký tự CJK là hợp lệ
    if (srcNonLatin <= 4 && outNonLatin === 0) return true;
  } else {
    const tTokens = t
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter(Boolean);
    if (tTokens.length > 0 && tTokens.length <= 2 && tTokens.every((w) => UNIVERSAL_SHORT_WORDS.has(w))) {
      return true;
    }

    const srcTokens = source.trim().split(/\s+/).filter(Boolean);
    if (srcTokens.length <= 2 && norm(t) === norm(source)) {
      const rawTokens = srcTokens
        .map((w) => w.replace(/^["'([–-]+|["')\].,!?:;…–-]+$/g, ""))
        .filter(Boolean);
      if (!rawTokens.length) return true;
      if (isAllCapsSource) return false;
      if (rawTokens.some((w) => UNTRANSLATED_SHORT_WORDS.has(w.toLowerCase()))) return false;
      // Chỉ chấp nhận giữ nguyên nếu mọi từ là tên riêng / thương hiệu / số (vd "Berlin.", "Elon Musk.", "iPhone 16.")
      return rawTokens.every((w) => /^[\p{Lu}\d]/u.test(w) || /[a-z][A-Z]/.test(w));
    }

    // Danh sách tên riêng / thương hiệu quốc tế cách nhau bởi dấu phẩy ("Instagram, TikTok, YouTube.")
    if (
      !isAllCapsSource &&
      srcTokens.length <= 6 &&
      /[,&/]/.test(source) &&
      srcTokens.every((w) => {
        const clean = w.replace(/^["'([–-]+|["')\].,!?:;…–-]+$/g, "");
        if (!clean || UNTRANSLATED_SHORT_WORDS.has(clean.toLowerCase())) return false;
        return /^[\p{Lu}][\p{Ll}\d]/u.test(clean) || /[a-z][A-Z]/.test(clean) || /^[\p{Lu}]{1,4}$/u.test(clean) || /^\d/.test(clean);
      })
    ) {
      return true;
    }
  }

  if (norm(t) === norm(source)) return false;
  if (VI_EXCLUSIVE_CHARS.test(t)) return true;
  if (VI_CHARS.test(t)) {
    if (/[çñüöäöß¿¡]/i.test(t)) return false;
    const tWords = t
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter(Boolean);
    const srcSet = new Set(
      source
        .toLowerCase()
        .split(/[^\p{L}]+/u)
        .filter(Boolean),
    );
    const overlap = tWords.length ? tWords.filter((w) => srcSet.has(w)).length / tWords.length : 0;
    if (overlap >= 0.5) return false;
    if (tWords.length <= 2) return true;
    return tWords.some((w) => VI_COMMON_WORDS.has(w));
  }

  // Chấp nhận câu số/đơn vị ("25 euro.", "100%") hoặc câu tiếng Việt không dấu thanh ("Anh tin em.")
  const words = t
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (words.length === 0) return /\d/.test(t);
  const viHits = words.filter((w) => VI_PLAIN_WORDS.has(w)).length;
  return viHits > 0 && viHits / words.length >= 0.5;
}

const keyOf = (text: string) => "vi:" + createHash("sha1").update(text.trim()).digest("hex");

class FormatError extends Error {}

function parseJsonLoose(raw: string): unknown {
  const trimmed = raw.trim();
  const stripped = trimmed.startsWith("```")
    ? trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim()
    : trimmed;
  return JSON.parse(stripped || "{}");
}

function extractTranslations(providerName: string, rawContent: string, expectedCount: number): string[] {
  let parsed: unknown;
  try {
    parsed = parseJsonLoose(rawContent);
  } catch {
    throw new FormatError(`${providerName}: JSON không hợp lệ`);
  }
  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  // Chấp nhận cả {"t": {"1": ...}} lẫn {"1": ...} ở cấp gốc nếu mô hình quên bọc khóa "t"
  const t: unknown = obj.t !== undefined ? obj.t : obj["1"] !== undefined ? obj : undefined;
  const out = Array.from({ length: expectedCount }, (_, i) => {
    const x = Array.isArray(t)
      ? t.length === expectedCount
        ? t[i]
        : undefined
      : (t as Record<string, unknown> | undefined)?.[i + 1];
    if (typeof x === "string") return x.trim();
    if (typeof x === "number" && Number.isFinite(x)) return String(x);
    return undefined;
  });
  if (!out.every((x) => x !== undefined)) {
    throw new FormatError(
      `${providerName}: trả về sai định dạng (${out.filter((x) => x !== undefined).length}/${expectedCount} câu)`,
    );
  }
  return out as string[];
}

async function callProvider(p: Provider, sentences: string[], systemPrompt = PROMPT): Promise<string[]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: p.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ s: Object.fromEntries(sentences.map((x, i) => [i + 1, x])) }) },
        ],
        ...p.extra,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (res.status === 429 && attempt < 1) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 1.5, 4);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data: { choices?: { message?: { content?: string } }[] } = await res.json();
    // Thiếu câu nào hoặc JSON lỗi = ném FormatError để chia đôi lô dịch lại
    return extractTranslations(p.name, data.choices?.[0]?.message?.content ?? "{}", sentences.length);
  }
}

/**
 * Dịch 1 lô câu: thử lần lượt từng nhà cung cấp; câu nào chưa ra tiếng Việt thì gửi riêng
 * cho nhà cung cấp kế tiếp. Nhà cung cấp nào cũng gộp câu (sai định dạng) → chia đôi lô, dịch lại.
 * Trả về bản dịch ("" = chưa dịch được) + tên nhà cung cấp.
 */
async function translateBatch(
  sentences: string[],
  systemPrompt = PROMPT,
): Promise<{ out: string; provider: string }[]> {
  const result = sentences.map(() => ({ out: "", provider: "" }));
  let todo = sentences.map((_, i) => i);
  let formatError = false;
  const list = providers();
  if (!list.length) throw new Error("Server chưa cấu hình AI để dịch.");

  for (const p of list) {
    if (!todo.length) break;
    try {
      const out = await callProvider(
        p,
        todo.map((i) => sentences[i]),
        systemPrompt,
      );
      todo.forEach((i, k) => {
        if (looksTranslated(sentences[i], out[k])) result[i] = { out: out[k], provider: p.name };
      });
      todo = todo.filter((i) => !result[i].out);
      if (todo.length) console.error(`[translate] ${p.name}: ${todo.length} câu chưa dịch, thử tiếp`);
    } catch (e) {
      if (e instanceof FormatError) formatError = true;
      console.error("[translate]", (e as Error).message);
    }
  }
  if (formatError && todo.length > 1) {
    const mid = Math.ceil(todo.length / 2);
    for (const part of [todo.slice(0, mid), todo.slice(mid)]) {
      const res = await translateBatch(
        part.map((i) => sentences[i]),
        systemPrompt,
      ).catch(() => null);
      part.forEach((i, k) => {
        if (res?.[k].out) result[i] = res[k];
      });
    }
    todo = todo.filter((i) => !result[i].out);
  }
  if (todo.length === sentences.length) throw new Error("Không dịch được lúc này.");
  return result;
}

export type DubTranslateItem = {
  text: string;
  /** Thời lượng gốc của câu (giây) */
  durationSec: number;
  /** Khoảng thời gian khả dụng trước khi câu tiếp theo bắt đầu (giây) */
  availSec: number;
  /** Nhãn người nói "A" | "B" (luân phiên theo dấu đổi lượt trong phụ đề), nếu có */
  spk?: string;
};

/** Câu kèm nhãn người nói ("A: …") dùng cho ngữ cảnh / kịch bản — giúp AI biết ai đang nói. */
const withSpk = (it: Pick<DubTranslateItem, "text" | "spk">) => (it.spk ? `${it.spk}: ${it.text}` : it.text);

export type DubStyleCard = {
  topic: string;
  genre?: string;
  summary?: string;
  speakers?: string;
  /** Vai & xưng hô riêng từng nhãn người nói, vd "A: MC nam – xưng tôi, gọi B là chị" */
  speakerRoles?: string[];
  tone: string;
  pronouns: string;
  voiceRules?: string[];
  glossary: string[];
  /** true nếu phần mở đầu (lô 0) đoán lệch xưng hô / giọng văn so với toàn bộ video → cần dịch lại lô 0 */
  openingMismatch?: boolean;
};

/** Lọc sạch mô tả video YouTube (bỏ link, hashtag, dòng mạng xã hội) để cung cấp ngữ cảnh tên nhân vật / chủ đề / chương video. */
export function cleanVideoDescription(raw?: string, maxChars = 600): string {
  if (!raw || !raw.trim()) return "";
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) =>
      l
        .replace(/https?:\/\/\S+|www\.\S+/gi, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((l) => l && !/^[#@]/.test(l) && /[\p{L}\p{N}]/u.test(l));
  const joined = lines.join(" · ").replace(/\s+/g, " ").trim();
  return joined.length > maxChars ? `${joined.slice(0, maxChars - 1).trimEnd()}…` : joined;
}

const STYLE_CARD_SYSTEM =
  "Bạn là đạo diễn thuyết minh (voice-over) tiếng Việt chuyên nghiệp. " +
  "Hãy đọc kỹ tiêu đề, tên kênh (`channel`), mô tả video (`description`, nếu có) và toàn bộ kịch bản phụ đề của video YouTube, nắm rõ bối cảnh, người nói, mạch nội dung và sắc thái cảm xúc từ đầu đến cuối, " +
  "rồi trả về JSON cẩm nang dịch để biên dịch viên Việt hóa lời thoại tự nhiên, đồng nhất cả video:\n" +
  "{\n" +
  '  "topic": "chủ đề video trong 1 câu ngắn",\n' +
  '  "genre": "thể loại cụ thể (vd: vlog cá nhân, review, phim tài liệu, tin tức, phỏng vấn/podcast, hướng dẫn thực tế, kể chuyện, hài/châm biếm…)",\n' +
  '  "summary": "tóm tắt mạch nội dung chính từ đầu đến cuối trong 2–3 câu để biên dịch viên hiểu ngữ cảnh, ẩn dụ và kết luận",\n' +
  '  "speakers": "mô tả người nói (vd: 1 người dẫn chuyện nói với khán giả; hoặc hội thoại 2 người: MC và khách mời…)",\n' +
  '  "tone": "văn phong thuyết minh cụ thể (vd: gần gũi tự nhiên kiểu YouTuber chia sẻ, trầm lắng sâu sắc kiểu phim tài liệu, sắc sảo gọn gàng kiểu bản tin…)",\n' +
  '  "pronouns": "quy ước xưng hô thống nhất cho từng vai (vd: mình – các bạn, tôi – mọi người, anh – em, ông ấy/cô ấy…)",\n' +
  '  "speakerRoles": ["CHỈ khi kịch bản có nhãn người nói \'A:\' / \'B:\': mỗi nhãn 1 dòng dạng \'A: vai trò (giới tính nếu đoán được) – xưng gì, gọi người kia là gì\' (vd: \'A: MC nam – xưng tôi, gọi B là chị\', \'B: khách mời nữ lớn tuổi – xưng tôi, gọi A là anh\'). Không có nhãn thì trả []"],\n' +
  '  "voiceRules": ["3–4 quy tắc văn nói tiếng Việt riêng cho video này (vd: có dùng từ nối/tiểu từ khẩu ngữ như thật ra, đấy, nha không; nhịp nhanh hay điềm đạm…)"],\n' +
  '  "glossary": ["tối đa 12 thuật ngữ, tên riêng hoặc cụm từ lặp lại quan trọng cần giữ nguyên/dịch thống nhất dạng \'gốc -> cách dịch\'"],\n' +
  '  "openingMismatch": false\n' +
  "}\n" +
  'Nếu đầu vào có `openingExamples` (các câu mở đầu đã dịch sẵn cho người nghe): khi xưng hô và giọng văn của `openingExamples` phù hợp với toàn bộ video thì đặt `pronouns` và `tone` đồng nhất với phần mở đầu (`"openingMismatch": false`); NGƯỢC LẠI, nếu đọc cả kịch bản thấy phần mở đầu đã đoán sai vai vế, giới tính, số người nói hoặc văn phong (vd tưởng vlog cá nhân nhưng thực chất là phỏng vấn trang trọng/phim tài liệu), hãy chọn `pronouns`, `tone`, `speakerRoles` chuẩn xác nhất cho cả video và đặt `"openingMismatch": true`.\n' +
  'Nhãn người nói \'A:\' / \'B:\' (nếu có) được đánh LUÂN PHIÊN mỗi lần phụ đề báo đổi người nói, nên chỉ là phỏng đoán: nếu nội dung cho thấy có từ 3 người trở lên hoặc nhãn bị lệch, hãy ghi rõ trong `speakers` (vd: \'MC A hỏi lần lượt 2 khách, nhãn B dùng chung cho cả 2 khách\').';

function isStyleCard(x: unknown): x is DubStyleCard {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.topic === "string" && typeof o.tone === "string" && typeof o.pronouns === "string";
}

const STYLE_SCRIPT_MAX_CHARS = 16_000;

/**
 * Chuẩn bị toàn bộ phụ đề cho bước đọc hiểu trước khi dịch.
 * Video ≤ ~18–25 phút gửi trọn vẹn 100%; video quá dài thì lấy trọn phần mở đầu + rải đều toàn trục + phần kết.
 */
function buildTranscriptForStyle(items: DubTranslateItem[]): { transcript: string; truncated: boolean } {
  const lines = items.map((x) => withSpk({ text: x.text.trim(), spk: x.spk })).filter((l) => l.replace(/^[AB]: /, ""));
  const full = lines.join("\n");
  if (full.length <= STYLE_SCRIPT_MAX_CHARS) return { transcript: full, truncated: false };

  const selected: string[] = [];
  let used = 0;
  const push = (s: string) => {
    selected.push(s);
    used += s.length + 1;
  };

  // Luôn lấy 20 câu mở đầu và 10 câu kết để nắm hook + kết luận
  const headCount = Math.min(20, lines.length);
  const tailCount = Math.min(10, Math.max(0, lines.length - headCount));
  const head = lines.slice(0, headCount);
  const tail = tailCount ? lines.slice(lines.length - tailCount) : [];
  const mid = lines.slice(headCount, lines.length - tailCount);

  const tailChars = tail.reduce((n, s) => n + s.length + 1, 0) + 32;
  for (const l of head) {
    if (used + l.length + 1 > STYLE_SCRIPT_MAX_CHARS - tailChars) break;
    push(l);
  }

  // Rải đều phần thân theo các đoạn ngắn 3 câu liền nhau để giữ mạch hội thoại
  const budgetForMid = Math.max(0, STYLE_SCRIPT_MAX_CHARS - used - tailChars);
  if (mid.length && budgetForMid > 400) {
    const blockSize = 3;
    const blocks: string[] = [];
    for (let i = 0; i < mid.length; i += blockSize) {
      blocks.push(mid.slice(i, i + blockSize).join("\n"));
    }
    const avgLen = Math.max(60, blocks.reduce((n, b) => n + b.length, 0) / blocks.length);
    const targetBlocks = Math.max(4, Math.min(blocks.length, Math.floor(budgetForMid / (avgLen + 8))));
    const step = blocks.length / targetBlocks;
    let midUsed = 0;
    for (let k = 0; k < targetBlocks; k++) {
      const b = blocks[Math.min(blocks.length - 1, Math.floor(k * step))];
      if (midUsed + b.length + 8 > budgetForMid) break;
      push("[...]");
      push(b);
      midUsed += b.length + 8;
    }
  }

  if (tail.length) {
    push("[...]");
    for (const l of tail) push(l);
  }
  return { transcript: selected.join("\n"), truncated: true };
}

async function buildDubStyleCard(
  items: DubTranslateItem[],
  title: string,
  sourceLang: string,
  openingExamples: StyleExample[] = [],
  signal?: AbortSignal,
  channel = "",
  description = "",
): Promise<DubStyleCard | null> {
  if (items.length <= 3) return null;
  const { transcript, truncated } = buildTranscriptForStyle(items);
  const cleanedDesc = cleanVideoDescription(description, 600);
  // Dùng đúng danh sách model thuyết minh (Groq 120b / DUB_TRANSLATE_MODEL → OpenAI) để không rơi xuống 20b
  // và đặt timeout mỗi provider 9s để kịp failover trong hạn STYLE_CARD_DEADLINE_MS.
  const styleProviders = dubProviders().map((p) => ({
    ...p,
    extra:
      p.extra && "temperature" in p.extra
        ? { ...(p.extra as Record<string, unknown>), temperature: 0.25 }
        : p.extra,
  }));
  try {
    const card = await chatJson<DubStyleCard>(
      STYLE_CARD_SYSTEM,
      {
        title: title || "(không có tiêu đề)",
        ...(channel ? { channel } : {}),
        ...(cleanedDesc ? { description: cleanedDesc } : {}),
        sourceLang,
        totalLines: items.length,
        ...(truncated ? { note: "Video dài nên đã trích rải đều từ đầu đến cuối; [...] là đoạn lược bớt." } : {}),
        ...(openingExamples.length ? { openingExamples } : {}),
        transcript,
      },
      isStyleCard,
      { providersList: styleProviders, timeoutMs: 9_000, signal },
    );
    const cleanList = (arr: unknown, max: number) =>
      Array.isArray(arr)
        ? arr
            .filter((g): g is string => typeof g === "string" && !!g.trim())
            .map((g) => g.trim().slice(0, 160))
            .slice(0, max)
        : [];
    return {
      topic: card.topic.trim().slice(0, 220),
      genre: typeof card.genre === "string" && card.genre.trim() ? card.genre.trim().slice(0, 120) : undefined,
      summary: typeof card.summary === "string" && card.summary.trim() ? card.summary.trim().slice(0, 420) : undefined,
      speakers: typeof card.speakers === "string" && card.speakers.trim() ? card.speakers.trim().slice(0, 180) : undefined,
      speakerRoles: items.some((x) => x.spk) ? cleanList(card.speakerRoles, 4) : [],
      tone: card.tone.trim().slice(0, 180),
      pronouns: card.pronouns.trim().slice(0, 140),
      voiceRules: cleanList(card.voiceRules, 5),
      glossary: cleanList(card.glossary, 12),
      ...(card.openingMismatch === true ? { openingMismatch: true } : {}),
    };
  } catch (e) {
    console.error("[dub-style-card]", (e as Error).message);
    return null;
  }
}

export type StyleExample = { orig: string; vi: string };

const SMART_DUB_SYSTEM = (
  lang: string,
  title: string,
  style: DubStyleCard | null,
  styleExamples: StyleExample[] = [],
  hasSpeakers = false,
  channel = "",
  description = "",
) => {
  const cleanedDesc = cleanVideoDescription(description, style?.summary ? 300 : 600);
  const ctxLines = [
    title ? `- Tiêu đề video: "${title}"` : "",
    channel ? `- Kênh: ${channel}` : "",
    cleanedDesc ? `- Mô tả video: ${cleanedDesc}` : "",
    style?.genre ? `- Thể loại: ${style.genre}` : "",
    style?.topic ? `- Chủ đề: ${style.topic}` : "",
    style?.summary ? `- Mạch nội dung toàn video: ${style.summary}` : "",
    style?.speakers ? `- Người nói: ${style.speakers}` : "",
    style?.speakerRoles?.length ? `- Vai & xưng hô từng người nói: ${style.speakerRoles.join("; ")}` : "",
    style?.tone ? `- Văn phong thuyết minh: ${style.tone}` : "",
    style?.pronouns ? `- Xưng hô thống nhất: ${style.pronouns}` : "",
    style?.voiceRules?.length ? `- Lưu ý văn nói: ${style.voiceRules.join("; ")}` : "",
    style?.glossary?.length ? `- Thuật ngữ / tên riêng: ${style.glossary.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const exampleBlock = styleExamples.length
    ? "Mẫu lời thoại đã dịch ở phần mở đầu (ƯU TIÊN bám sát đúng cách xưng hô và giọng văn này để cả video thống nhất, không đổi xưng hô giữa chừng):\n" +
      styleExamples.map((e) => `- "${e.orig}" => "${e.vi}"`).join("\n") +
      "\n"
    : "";

  const firstBatchGuide =
    !style && !styleExamples.length
      ? "Chưa có cẩm nang tóm tắt toàn bài: hãy suy luận ngay thể loại, số người nói và cách xưng hô phù hợp nhất từ `Tiêu đề video` + `overview` để phần mở đầu khớp mạch cả video.\n"
      : "";

  const speakerGuide = hasSpeakers
    ? '- "sp" trong mỗi câu là nhãn người nói "A"/"B" (ngữ cảnh `prev`/`next`/`overview` cũng ghi dạng "A: …"). Nhãn được đánh luân phiên mỗi lần phụ đề báo đổi người nói nên chỉ là phỏng đoán.\n'
    : "";
  const speakerRule = hasSpeakers
    ? "6. Video có nhiều người nói: mỗi câu dùng đúng xưng hô theo vai của người có nhãn `sp` (theo cẩm nang \"Vai & xưng hô từng người nói\" nếu có). Khi `sp` đổi so với câu trước là người kia đang đáp lời → đảo ngôi cho khớp (A xưng \"tôi\" gọi B là \"anh\" thì B xưng \"tôi/em\" và gọi A tương ứng); câu cùng `sp` liên tiếp giữ nguyên ngôi. Không bao giờ để một người tự gọi mình bằng ngôi của người kia. Nếu nội dung cho thấy nhãn sai (vd có người thứ ba), ưu tiên nội dung.\n"
    : "";

  return (
    `Bạn là biên dịch viên thuyết minh video (voice-over) tiếng Việt chuyên nghiệp, Việt hóa phụ đề từ ngôn ngữ "${lang}" sang tiếng Việt tự nhiên như người bản xứ nói.\n` +
    (ctxLines ? `Cẩm nang toàn video (đã đọc hết kịch bản):\n${ctxLines}\n` : "") +
    firstBatchGuide +
    exampleBlock +
    "Đầu vào JSON gồm:\n" +
    '- "overview" (tuỳ chọn): vài câu trích rải đều phần giữa & cuối video — chỉ để nắm đúng thể loại, cảm xúc, người nói và cách xưng hô tổng quan của cả bài, KHÔNG dịch lại.\n' +
    '- "prev" (tuỳ chọn): vài câu ngay trước đó — chỉ để nối mạch và giữ đúng xưng hô, KHÔNG dịch lại.\n' +
    '- "prevVi" (tuỳ chọn): bản tiếng Việt đã dịch của 1–2 câu ngay trước đó — nối tiếp thật tự nhiên, giữ đúng xưng hô và tránh lặp lại chủ ngữ vừa nói, KHÔNG dịch lại.\n' +
    '- "items": danh sách câu cần dịch dạng {"1": {"s": số giây, "max": số từ tiếng Việt tham khảo, "text": câu gốc}, …}.\n' +
    speakerGuide +
    '- "next" (tuỳ chọn): vài câu tiếp theo — chỉ để biết mạch câu sắp nói, KHÔNG dịch lại.\n' +
    "Quy tắc bắt buộc:\n" +
    "1. Đọc hiểu cả cụm `prev` + `items` + `next` (và `overview` nếu có) để nắm đúng ý định và văn phong chung của cả video, rồi DIỄN ĐẠT LẠI bằng văn nói tiếng Việt trôi chảy (TUYỆT ĐỐI không dịch bám sát từng từ hay cấu trúc ngữ pháp câu gốc).\n" +
    "2. Tránh bệnh dịch khô kiểu Tây: KHÔNG dịch cứng 'Es ist / It is' thành 'Nó là…'; chuyển câu bị động Tây ('được làm bởi…') sang câu chủ động tự nhiên; tách hoặc đảo lại mệnh đề quan hệ/cụm danh từ dài cho thuận tai. Chuyển thành ngữ và từ đệm (halt, quasi, eben, basically, you know…) sang từ nối hoặc tiểu từ tiếng Việt phù hợp với văn phong video.\n" +
    "3. Giữ đúng xưng hô và mạch nối dựa vào mẫu phần mở đầu, cẩm nang, `overview`, `prevVi` và `prev`/`next`; nếu hai câu liên tiếp là hai vế của cùng một ý bị tách dòng, hãy dịch sao cho đọc nối tiếp nghe liền mạch tự nhiên, không lặp chủ ngữ thừa. Nếu là hội thoại/phỏng vấn nhiều người nói, thể hiện đúng ngữ khí và đại từ đổi vai giữa người hỏi và người trả lời.\n" +
    "4. Tối ưu cho giọng đọc AI (TTS) và ngữ điệu tự nhiên theo thể loại (tin tức sắc gọn, vlog thân mật, tài liệu điềm đạm, hài hước linh hoạt): đặt dấu phẩy (,), chấm (.), hỏi (?), than (!), ba chấm (…) đúng nhịp thở và điểm nhấn cảm xúc. Coi `max` chỉ là mốc tham khảo mềm — ưu tiên câu trọn ý, trôi chảy, đủ chủ-vị và từ nối (KHÔNG cắt cụt câu hay bỏ từ làm câu bị cộc/khô). Viết số, đơn vị, ký hiệu theo cách đọc tự nhiên (vd: '25%' → '25 phần trăm', '€50' → '50 euro', 'km/h' → 'ki-lô-mét trên giờ'), không để chú thích trong ngoặc. TUYỆT ĐỐI KHÔNG dịch hay đọc mô tả âm thanh, nhạc nền, tiếng động, tên người đọc hoặc chú thích phụ đề (vd: '[Musik]', '(sanfte Musik)', '(lacht)', '(Off-Stimme)', 'Sprecher:', '♪…♪'); nếu cả câu chỉ là mô tả không phải lời thoại thì trả về đúng \"[SKIP]\".\n" +
    "5. Giữ ĐÚNG số lượng và thứ tự khóa trong `items` (1..N), tuyệt đối không gộp hay bỏ sót câu.\n" +
    speakerRule +
    'Trả về đúng JSON {"t": {"1": "...", "2": "...", …}}, không giải thích.'
  );
};

async function callSmartDubProvider(
  p: Provider,
  systemPrompt: string,
  payload: object,
  expectedCount: number,
  fastFailover = false,
): Promise<string[]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: p.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) },
        ],
        ...p.extra,
      }),
      signal: AbortSignal.timeout(fastFailover ? 20_000 : 35_000),
    });
    // Lô đầu (fastFailover): nếu 429 bắt chờ > 2s → chuyển ngay sang provider kế tiếp thay vì treo người dùng chờ 12s
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      const maxAttempts = fastFailover ? 1 : 2;
      if (attempt < maxAttempts && (!fastFailover || retryAfter <= 2)) {
        const wait = Math.min(retryAfter || 1.5 * (attempt + 1), fastFailover ? 2 : 6);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
    }
    if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data: { choices?: { message?: { content?: string } }[] } = await res.json();
    return extractTranslations(p.name, data.choices?.[0]?.message?.content ?? "{}", expectedCount);
  }
}

function dubProviders(): Provider[] {
  // Thuyết minh ưu tiên mô hình lớn để tiếng Việt tự nhiên, không dùng mô hình nhỏ 20b:
  // mặc định Groq 120b (nhanh, rẻ, temperature 0.45 cho văn nói tự nhiên) → dự phòng OpenAI.
  // Có thể đặt DUB_TRANSLATE_PREFER=openai nếu muốn ưu tiên OpenAI trước, hoặc DUB_TRANSLATE_MODEL để đổi mô hình Groq.
  const groqList: Provider[] = [];
  const groqKey = process.env.TRANSLATE_API_KEY ?? process.env.TRANSCRIBE_API_KEY;
  const groqUrl =
    process.env.TRANSLATE_API_URL ??
    process.env.TRANSCRIBE_API_URL?.replace(/\/audio\/transcriptions$/, "/chat/completions") ??
    "https://api.groq.com/openai/v1/chat/completions";
  if (groqKey && !groqUrl.includes("api.openai.com")) {
    const dubModel = process.env.DUB_TRANSLATE_MODEL ?? process.env.TRANSLATE_RETRY_MODEL ?? "openai/gpt-oss-120b";
    groqList.push({
      name: `groq:${dubModel}`,
      url: groqUrl,
      key: groqKey,
      model: dubModel,
      extra: { reasoning_effort: "low", temperature: 0.45 },
    });
  }

  const openaiList: Provider[] = [];
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const openaiModel = process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-5-mini";
    const isReasoning = /^(gpt-5|o\d)/.test(openaiModel);
    openaiList.push({
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: openaiModel,
      extra: isReasoning ? { reasoning_effort: "low" } : { temperature: 0.45 },
    });
  }

  return process.env.DUB_TRANSLATE_PREFER === "openai"
    ? [...openaiList, ...groqList]
    : [...groqList, ...openaiList];
}

async function translateSmartDubChunk(
  chunk: DubTranslateItem[],
  prevCtx: string[],
  nextCtx: string[],
  systemPrompt: string,
  overviewCtx: string[] = [],
  fastFailover = false,
  prevViCtx: string[] = [],
): Promise<string[]> {
  const list = dubProviders();
  if (!list.length) throw new Error("Server chưa cấu hình AI để dịch.");

  const result = chunk.map(() => "");
  let todo = chunk.map((_, i) => i);
  let formatError = false;

  const makePayload = (indices: number[]) => ({
    ...(overviewCtx.length ? { overview: overviewCtx } : {}),
    ...(prevCtx.length ? { prev: prevCtx } : {}),
    ...(prevViCtx.length ? { prevVi: prevViCtx } : {}),
    items: Object.fromEntries(
      indices.map((idx, pos) => {
        const it = chunk[idx];
        const s = Math.max(0.6, Math.round(it.availSec * 10) / 10);
        // Nới mốc tham khảo (~5 từ/giây, tối thiểu 8 từ) vì player tự đẩy tốc độ tới 1.45× → tránh AI ép câu bị cộc/cụt ý
        const max = Math.max(8, Math.min(120, Math.round(s * 5.0)));
        return [pos + 1, { s, max, ...(it.spk ? { sp: it.spk } : {}), text: it.text }];
      }),
    ),
    ...(nextCtx.length ? { next: nextCtx } : {}),
  });

  for (const p of list) {
    if (!todo.length) break;
    try {
      const out = await callSmartDubProvider(p, systemPrompt, makePayload(todo), todo.length, fastFailover);
      todo.forEach((idx, k) => {
        if (looksTranslated(chunk[idx].text, out[k])) result[idx] = out[k];
      });
      todo = todo.filter((idx) => !result[idx]);
      if (todo.length) console.error(`[dub-smart] ${p.name}: ${todo.length} câu chưa dịch, thử tiếp`);
    } catch (e) {
      if (e instanceof FormatError) formatError = true;
      console.error("[dub-smart]", (e as Error).message);
    }
  }

  if (formatError && todo.length > 1) {
    const mid = Math.ceil(todo.length / 2);
    for (const part of [todo.slice(0, mid), todo.slice(mid)]) {
      const first = part[0];
      const last = part[part.length - 1];
      const partPrev = first > 0 ? chunk.slice(Math.max(0, first - 2), first).map(withSpk) : prevCtx;
      const partNext = last < chunk.length - 1 ? chunk.slice(last + 1, last + 3).map(withSpk) : nextCtx;
      const partPrevVi = first > 0 ? buildPrevViCtx(chunk, result, first) : prevViCtx;
      const sub = await translateSmartDubChunk(
        part.map((i) => chunk[i]),
        partPrev,
        partNext,
        systemPrompt,
        overviewCtx,
        fastFailover,
        partPrevVi,
      ).catch(() => null);
      part.forEach((idx, k) => {
        if (sub?.[k]) result[idx] = sub[k];
      });
    }
    todo = todo.filter((idx) => !result[idx]);
  }

  if (todo.length === chunk.length) throw new Error("Không dịch được lúc này.");
  // "" = câu chưa dịch được. Không thay bằng câu gốc: giọng Việt sẽ đọc tiếng nước ngoài thành vô nghĩa.
  return result;
}

/** Dịch 1 lô, lỗi thì đợi chút rồi thử lại 1 lần (thường do 429 / mạng chập chờn). */
async function translateSmartDubChunkRetry(
  chunk: DubTranslateItem[],
  prevCtx: string[],
  nextCtx: string[],
  systemPrompt: string,
  overviewCtx: string[] = [],
  fastFailover = false,
  prevViCtx: string[] = [],
): Promise<string[]> {
  try {
    return await translateSmartDubChunk(chunk, prevCtx, nextCtx, systemPrompt, overviewCtx, fastFailover, prevViCtx);
  } catch (e) {
    console.error("[dub-smart] lô lỗi, thử lại:", (e as Error).message);
    await new Promise((r) => setTimeout(r, fastFailover ? 800 : CHUNK_RETRY_DELAY_MS));
    return translateSmartDubChunk(chunk, prevCtx, nextCtx, systemPrompt, overviewCtx, fastFailover, prevViCtx);
  }
}

const CHUNK_RETRY_DELAY_MS = 2_500;
/** Thời hạn chờ đọc toàn bộ phụ đề sinh Style Bible (đủ thời gian failover Groq → OpenAI) trước khi bỏ qua. */
const STYLE_CARD_DEADLINE_MS = 16_000;

const FIRST_DUB_BATCH = 10; // Lô đầu 10 câu (~45–60s đầu) dịch siêu nhanh (~1.5–2.5s) để mở video gần như tức thì
const NEXT_DUB_BATCH = 25; // Các lô sau 25 câu — cân bằng giữa tốc độ và tránh chạm trần TPM / cắt cụt JSON
const DUB_CONCURRENCY = 3; // 3 luồng song song giúp bám sát giới hạn TPM của Groq 120b, giảm rớt lô 429

/** Trích ~12 câu rải đều giữa & cuối video (~1.200 ký tự) để lô đầu nắm đúng văn phong toàn bài mà không tốn thời gian chờ. */
function buildQuickOverview(items: DubTranslateItem[], fromIndex: number): string[] {
  const rest = items.slice(fromIndex);
  if (!rest.length) return [];
  const target = Math.min(12, rest.length);
  const picked: string[] = [];
  let chars = 0;
  for (let k = 0; k < target; k++) {
    const idx = target === 1 ? 0 : Math.floor((k * (rest.length - 1)) / (target - 1));
    const line = withSpk({ text: rest[idx].text.trim().slice(0, 140), spk: rest[idx].spk });
    if (!line || chars + line.length > 1400) break;
    picked.push(line);
    chars += line.length;
  }
  return picked;
}

/** Tạo danh sách 1–2 câu tiếng Việt ngay trước `startIdx`, giữ nguyên nhãn người nói `spk` để câu sau nối mạch và đảo vai đúng. */
function buildPrevViCtx(
  items: Pick<DubTranslateItem, "spk">[],
  translations: (string | undefined)[],
  startIdx: number,
): string[] {
  if (startIdx <= 0) return [];
  const out: string[] = [];
  for (let k = Math.max(0, startIdx - 2); k < startIdx; k++) {
    const vi = translations[k];
    if (vi && !isDubSkip(vi)) out.push(withSpk({ text: vi, spk: items[k]?.spk }));
  }
  return out;
}

/** Chọn tối đa 5 cặp câu đã dịch làm mẫu giọng văn & xưng hô (ưu tiên câu dài ≥20 ký tự, thiếu thì bổ sung câu ngắn ≥6 ký tự). */
export function pickStyleExamples(
  items: Pick<DubTranslateItem, "text" | "spk">[],
  translations: string[],
  limit = items.length,
): StyleExample[] {
  const end = Math.min(limit, items.length, translations.length);
  const candidates: StyleExample[] = [];
  const used = new Set<number>();

  for (let i = 0; i < end; i++) {
    const orig = items[i]?.text.trim() ?? "";
    const vi = translations[i]?.trim() ?? "";
    const spk = items[i]?.spk;
    if (orig.length >= 20 && vi.length >= 15 && !isDubSkip(vi)) {
      candidates.push({
        orig: withSpk({ text: orig.slice(0, 180), spk }),
        vi: withSpk({ text: vi.slice(0, 200), spk }),
      });
      used.add(i);
    }
  }
  if (candidates.length < 3) {
    for (let i = 0; i < end && candidates.length < 5; i++) {
      if (used.has(i)) continue;
      const orig = items[i]?.text.trim() ?? "";
      const vi = translations[i]?.trim() ?? "";
      const spk = items[i]?.spk;
      if (orig.length >= 6 && vi.length >= 6 && !isDubSkip(vi)) {
        candidates.push({
          orig: withSpk({ text: orig.slice(0, 180), spk }),
          vi: withSpk({ text: vi.slice(0, 200), spk }),
        });
      }
    }
  }

  const target = Math.min(5, candidates.length);
  if (target === 0) return [];
  if (candidates.length <= target) return candidates;
  const picked: StyleExample[] = [];
  for (let k = 0; k < target; k++) {
    picked.push(candidates[Math.floor((k * (candidates.length - 1)) / (target - 1))]);
  }
  return picked;
}

/**
 * Dịch thuyết minh thông minh:
 * - Bước 1: Dịch ngay lô đầu 10 câu (kèm overview toàn bài) bằng mô hình lớn (Groq 120b → OpenAI) → gọi `onChunk` để phát video liền.
 * - Bước 2: Sau khi mở phát, sinh Style Bible từ toàn bộ phụ đề (kèm `openingExamples` từ lô đầu) theo đúng model thuyết minh;
 *           nếu phát hiện lô đầu đoán lệch xưng hô (`openingMismatch`), tự động dịch lại lô 0 theo Style Bible.
 * - Bước 3: Dịch các lô 25 câu còn lại (tuần tự nếu ≤ 4 lô để mọi lô đều có `prevVi` liền kề; tối đa 2 luồng nếu video dài).
 */
export async function translateForDubbingSmart(
  items: DubTranslateItem[],
  {
    title = "",
    channel = "",
    description = "",
    sourceLang = "auto",
    onProgress,
    onChunk,
  }: {
    title?: string;
    channel?: string;
    description?: string;
    sourceLang?: string;
    onProgress?: (info: { phase: "style" | "translate"; done: number; total: number }) => void;
    onChunk?: (info: { start: number; translations: string[]; done: number; total: number }) => void;
  } = {},
): Promise<{ translations: string[]; style: DubStyleCard | null }> {
  const lang = (sourceLang || "auto").toLowerCase();
  if (!items.length || lang === "vi" || lang.startsWith("vi-")) {
    return { translations: items.map((x) => x.text), style: null };
  }

  const hasSpeakers = items.some((x) => x.spk);
  const initialPrompt = SMART_DUB_SYSTEM(sourceLang || "auto", title, null, [], hasSpeakers, channel, description);
  const out: string[] = new Array(items.length);
  onProgress?.({ phase: "translate", done: 0, total: items.length });

  // Chia lô: lô đầu nhỏ (10 câu) để phát tức thì, các lô sau 25 câu
  const ranges: { start: number; end: number }[] = [];
  if (items.length > 0) {
    const firstEnd = Math.min(items.length, FIRST_DUB_BATCH);
    ranges.push({ start: 0, end: firstEnd });
    for (let s = firstEnd; s < items.length; s += NEXT_DUB_BATCH) {
      ranges.push({ start: s, end: Math.min(items.length, s + NEXT_DUB_BATCH) });
    }
  }

  let doneCount = 0;

  const runRange = async (
    r: { start: number; end: number },
    prompt: string,
    mustSucceed = false,
    overviewCtx: string[] = [],
    retranslate = false,
  ) => {
    const chunk = items.slice(r.start, r.end);
    const prevCtx = items.slice(Math.max(0, r.start - 2), r.start).map(withSpk);
    const nextCtx = items.slice(r.end, r.end + 2).map(withSpk);
    const prevViCtx = buildPrevViCtx(items, out, r.start);
    let translated: string[];
    try {
      translated = await translateSmartDubChunkRetry(chunk, prevCtx, nextCtx, prompt, overviewCtx, mustSucceed, prevViCtx);
    } catch (e) {
      // Lô đầu hỏng thì chưa có gì để phát → báo lỗi. Lô sau hỏng thì để trống; dịch lại lỗi thì giữ nguyên bản cũ.
      if (mustSucceed) throw e;
      console.error(`[dub-smart] bỏ lô ${r.start}-${r.end}:`, (e as Error).message);
      if (retranslate) return;
      translated = chunk.map(() => "");
    }
    const finalChunk = translated.map((t, k) => {
      const next = t || (retranslate ? out[r.start + k] ?? "" : "");
      out[r.start + k] = next;
      return next;
    });
    if (!retranslate) doneCount += chunk.length;
    onChunk?.({ start: r.start, translations: finalChunk, done: doneCount, total: items.length });
    onProgress?.({ phase: "translate", done: doneCount, total: items.length });
  };

  // Lô 0 chạy ĐỘC QUYỀN trước (chỉ ~1.200 token + overview toàn bài, KHÔNG bị Style Bible tranh TPM Groq)
  // → mở tiếng trong ~1.5–2.5 giây!
  if (ranges.length > 0) {
    const overview = buildQuickOverview(items, ranges[0].end + 2);
    await runRange(ranges[0], initialPrompt, true, overview);
  }

  // Chỉ sau khi người dùng đã bắt đầu nghe lô đầu mới chạy Style Bible (16.000 ký tự) cho các lô phía sau,
  // truyền kèm các câu mẫu lô 0 để Style Bible khoá đúng xưng hô & sắc thái thống nhất từ đầu tới cuối.
  const rest = ranges.slice(1);
  let style: DubStyleCard | null = null;
  if (rest.length > 0) {
    onProgress?.({ phase: "style", done: doneCount, total: items.length });
    const examples = pickStyleExamples(items, out, ranges[0].end);
    const styleAc = new AbortController();
    const styleTimer = setTimeout(() => styleAc.abort(), STYLE_CARD_DEADLINE_MS);
    style = await buildDubStyleCard(
      items,
      title,
      sourceLang || "auto",
      examples,
      styleAc.signal,
      channel,
      description,
    ).finally(() => clearTimeout(styleTimer));
    const mismatch = Boolean(style?.openingMismatch);
    const restPrompt = SMART_DUB_SYSTEM(
      sourceLang || "auto",
      title,
      style,
      mismatch ? [] : examples,
      hasSpeakers,
      channel,
      description,
    );
    if (mismatch) {
      await runRange(ranges[0], restPrompt, false, [], true);
    }
    const concurrency = rest.length <= 4 ? 1 : Math.min(2, rest.length);
    let cursor = 0;
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (cursor < rest.length) {
          const r = rest[cursor++];
          await runRange(r, restPrompt);
        }
      }),
    );
  }

  return { translations: out, style };
}

/**
 * Dịch bù các câu còn thiếu của một video đã dịch (theo chỉ số trong `items`).
 * Gom các chỉ số liền nhau thành lô ≤ 25 câu, kèm 2 câu trước/sau (cả tiếng gốc lẫn tiếng Việt đã dịch) và mẫu văn phong.
 * Trả về Map chỉ số → bản dịch (chỉ những câu dịch được).
 */
export async function translateDubRepair(
  items: DubTranslateItem[],
  indices: number[],
  {
    title = "",
    channel = "",
    description = "",
    sourceLang = "auto",
    style = null,
    styleExamples = [],
    existingTranslations,
    onChunk,
  }: {
    title?: string;
    channel?: string;
    description?: string;
    sourceLang?: string;
    style?: DubStyleCard | null;
    styleExamples?: StyleExample[];
    existingTranslations?: string[];
    onChunk?: (info: { start: number; translations: string[]; done: number; total: number }) => void;
  } = {},
): Promise<Map<number, string>> {
  const fixed = new Map<number, string>();
  const sorted = [...new Set(indices)].filter((i) => i >= 0 && i < items.length).sort((a, b) => a - b);
  if (!sorted.length) return fixed;

  const knownVi = existingTranslations ? existingTranslations.slice() : new Array<string>(items.length).fill("");
  const groups: number[][] = [];
  for (const i of sorted) {
    const g = groups[groups.length - 1];
    if (g && i === g[g.length - 1] + 1 && g.length < NEXT_DUB_BATCH) g.push(i);
    else groups.push([i]);
  }

  const systemPrompt = SMART_DUB_SYSTEM(
    sourceLang || "auto",
    title,
    style,
    styleExamples,
    items.some((x) => x.spk),
    channel,
    description,
  );
  let cursor = 0;
  let repairedDone = 0;
  await Promise.all(
    Array.from({ length: Math.min(DUB_CONCURRENCY, groups.length) }, async () => {
      while (cursor < groups.length) {
        const g = groups[cursor++];
        const first = g[0];
        const last = g[g.length - 1];
        const prevCtx = items.slice(Math.max(0, first - 2), first).map(withSpk);
        const nextCtx = items.slice(last + 1, last + 3).map(withSpk);
        const prevViCtx = buildPrevViCtx(items, knownVi, first);
        const out = await translateSmartDubChunkRetry(
          g.map((i) => items[i]),
          prevCtx,
          nextCtx,
          systemPrompt,
          [],
          false,
          prevViCtx,
        ).catch(() => null);
        const groupTranslations = g.map((idx, k) => {
          const tr = out?.[k] || "";
          if (tr) {
            fixed.set(idx, tr);
            knownVi[idx] = tr;
          }
          return tr;
        });
        repairedDone += g.length;
        onChunk?.({ start: first, translations: groupTranslations, done: repairedDone, total: sorted.length });
      }
    }),
  );
  return fixed;
}

/** Kiểm tra nhanh có câu nào chưa có bản dịch hợp lệ trong SQLite cache không (để không trừ rate-limit cho cache hit). */
export function hasUncachedSentences(sentences: string[]): boolean {
  const keys = sentences.map(keyOf);
  const cached = getTranslations(keys);
  return sentences.some((s, i) => {
    const trimmed = s.trim();
    if (!trimmed) return false;
    const t = cached.get(keys[i]);
    return t === undefined || !looksTranslated(s, t);
  });
}

/** Dịch danh sách câu (giữ thứ tự). Câu đã có trong kho thì không gọi AI. "" = chưa dịch được. */
export async function translateSentences(sentences: string[]): Promise<string[]> {
  const keys = sentences.map(keyOf);
  const cached = getTranslations(keys);
  // Bản dịch hỏng đã lỡ lưu từ trước (vẫn là tiếng Đức) → bỏ qua để dịch lại, ghi đè
  sentences.forEach((s, i) => {
    const t = cached.get(keys[i]);
    if (t !== undefined && !looksTranslated(s, t)) cached.delete(keys[i]);
  });
  const missing = [...new Set(sentences.filter((_, i) => !cached.has(keys[i])).map((s) => s.trim()))].filter(Boolean);

  const chunks: string[][] = [];
  for (let i = 0; i < missing.length; i += BATCH) {
    chunks.push(missing.slice(i, i + BATCH));
  }

  // Dịch song song tối đa 2 lô (mỗi request /api/v1/translate tối đa 40 câu → nhanh gần gấp đôi)
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(2, chunks.length) }, async () => {
      while (cursor < chunks.length) {
        const chunk = chunks[cursor++];
        const res = await translateBatch(chunk);
        // Chỉ lưu câu dịch được; câu hỏng lần sau sẽ thử lại
        const rows = chunk
          .map((text, k) => ({ key: keyOf(text), text, translation: res[k].out, provider: res[k].provider }))
          .filter((r) => r.translation);
        saveTranslations(rows);
        for (const r of rows) cached.set(r.key, r.translation);
      }
    }),
  );
  return keys.map((k) => cached.get(k) ?? "");
}

/**
 * Gọi AI trả về JSON (dùng chung nhà cung cấp với phần dịch câu), thử lần lượt từng nhà cung cấp.
 * `valid` kiểm tra kết quả; sai định dạng → thử nhà cung cấp kế tiếp.
 */
export async function chatJson<T>(
  system: string,
  user: unknown,
  valid: (x: unknown) => x is T,
  opts: { prefer?: "openai" | "large"; timeoutMs?: number; providersList?: Provider[]; signal?: AbortSignal } = {},
): Promise<T & { provider: string }> {
  let list: Provider[];
  if (opts.providersList) {
    list = opts.providersList;
  } else {
    const all = providers();
    // prefer "openai": ChatGPT trước (chậm hơn nhưng tiếng Việt tự nhiên nhất) → Groq lớn → Groq nhỏ
    // prefer "large":  Groq lớn trước (nhanh, đủ chính xác cho nội dung dài) → ChatGPT → Groq nhỏ
    const small = process.env.TRANSLATE_MODEL ?? "openai/gpt-oss-20b";
    const rank = (p: Provider) =>
      p.model === small ? 2 : opts.prefer === "openai" ? (p.name === "openai" ? 0 : 1) : p.name === "openai" ? 1 : 0;
    list = opts.prefer ? [...all].sort((a, b) => rank(a) - rank(b)) : all;
  }
  if (!list.length) throw new Error("Server chưa cấu hình AI để dịch.");
  for (const p of list) {
    if (opts.signal?.aborted) break;
    const timeoutSig = AbortSignal.timeout(opts.timeoutMs ?? 30_000);
    const sig = opts.signal ? AbortSignal.any([timeoutSig, opts.signal]) : timeoutSig;
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({
          model: p.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(user) },
          ],
          ...p.extra,
        }),
        signal: sig,
      });
      if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data: { choices?: { message?: { content?: string } }[] } = await res.json();
      const parsed: unknown = parseJsonLoose(data.choices?.[0]?.message?.content ?? "{}");
      if (valid(parsed)) return { ...parsed, provider: p.name };
      throw new Error(`${p.name}: trả về sai định dạng`);
    } catch (e) {
      console.error("[chatJson]", (e as Error).message);
      if (opts.signal?.aborted) break;
    }
  }
  throw new Error("Không dịch được lúc này.");
}
