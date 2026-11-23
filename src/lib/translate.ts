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

const DUB_PROMPT = (lang: string) =>
  `Bạn là biên dịch viên thuyết minh video chuyên nghiệp, dịch phụ đề từ ngôn ngữ "${lang}" sang tiếng Việt tự nhiên để đọc thuyết minh (voice-over). ` +
  'Nhận JSON {"s": {"1": dòng 1, "2": dòng 2, …}} là các dòng phụ đề liên tiếp trong video. ' +
  "Dịch từng dòng sang tiếng Việt ngắn gọn, tự nhiên như lời nói, dễ đọc bằng giọng AI (viết số và đơn vị tự nhiên như 'euro', 'phần trăm', 'giờ'). " +
  "Giữ nguyên số lượng và thứ tự khóa: mỗi khóa dịch đúng dòng tương ứng, không gộp hay bỏ sót dòng. " +
  'Trả về đúng JSON {"t": {"1": bản dịch dòng 1, "2": bản dịch dòng 2, …}}, không giải thích.';

const BATCH = 25; // số câu mỗi lần gọi AI

const VI_CHARS = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
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

/**
 * Bản dịch có thật là tiếng Việt không? Mô hình nhỏ đôi khi chép lại nguyên câu gốc.
 * - Với chữ CJK / không phải Latin (Nhật, Trung, Hàn, Nga…): không dùng mẹo đếm khoảng trắng <= 2,
 *   mà kiểm tra xem bản dịch còn giữ chữ gốc không.
 * - Với câu Latin ngắn (≤ 2 từ: "Okay.", "Berlin!"): giữ nguyên cũng được.
 * - Với câu tiếng Việt hợp lệ nhưng không có dấu thanh ("Anh tin em.", "25 euro."): vẫn chấp nhận.
 */
export function looksTranslated(source: string, translation: string): boolean {
  const t = translation.trim();
  if (!t) return false;
  // Câu chỉ có số / ký hiệu ("10, 9, 8", "2024, 2025, 2026") giữ nguyên vẫn hợp lệ
  if (!/\p{L}/u.test(source)) return true;

  const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

  const srcNonLatin = (source.match(NON_LATIN_SCRIPT) ?? []).length;
  const outNonLatin = (t.match(NON_LATIN_SCRIPT) ?? []).length;
  const outLetters = (t.match(/\p{L}/gu) ?? []).length;

  // Bản dịch vẫn còn nhiều ký tự ngoại ngữ (Nhật/Trung/Hàn/Nga/Ả Rập/Thái) → chưa dịch
  if (outNonLatin > 0 && outLetters > 0 && outNonLatin / outLetters > 0.2) return false;

  if (srcNonLatin > 0) {
    if (norm(t) === norm(source)) return false;
    // Cụm CJK rất ngắn (tên riêng 1–4 chữ, vd "東京" → "Tokyo") sau khi bỏ hết ký tự CJK là hợp lệ
    if (srcNonLatin <= 4 && outNonLatin === 0) return true;
  } else {
    const srcTokens = source.trim().split(/\s+/).filter(Boolean);
    if (srcTokens.length <= 2) return true;
    // Danh sách tên riêng / thương hiệu quốc tế cách nhau bởi dấu phẩy ("Instagram, TikTok, YouTube.")
    if (
      srcTokens.length <= 6 &&
      /[,&/]/.test(source) &&
      srcTokens.every((w) => /^[\p{Lu}\d]/u.test(w.replace(/^["'([–-]+/, "")))
    ) {
      return true;
    }
  }

  if (norm(t) === norm(source)) return false;
  if (VI_CHARS.test(t)) return true;

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

/** Dịch phụ đề ngôn ngữ bất kỳ → tiếng Việt tự nhiên để thuyết minh (dùng chung kho cache SQLite). */
export async function translateForDubbing(sentences: string[], sourceLang = "auto"): Promise<string[]> {
  const lang = (sourceLang || "auto").toLowerCase();
  if (lang === "vi" || lang.startsWith("vi-")) return sentences;
  const prompt = DUB_PROMPT(sourceLang || "auto");
  const keyFn = (text: string) => `dub:vi:${lang}:` + createHash("sha1").update(text.trim()).digest("hex");
  const keys = sentences.map(keyFn);
  const cached = getTranslations(keys);
  const missing = [...new Set(sentences.filter((_, i) => !cached.has(keys[i])).map((s) => s.trim()))].filter(Boolean);

  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    const res = await translateBatch(chunk, prompt);
    const rows = chunk
      .map((text, k) => ({ key: keyFn(text), text, translation: res[k].out, provider: res[k].provider }))
      .filter((r) => r.translation);
    saveTranslations(rows);
    for (const r of rows) cached.set(r.key, r.translation);
  }
  return keys.map((k, i) => cached.get(k) || sentences[i]);
}

export type DubTranslateItem = {
  text: string;
  /** Thời lượng gốc của câu (giây) */
  durationSec: number;
  /** Khoảng thời gian khả dụng trước khi câu tiếp theo bắt đầu (giây) */
  availSec: number;
};

export type DubStyleCard = {
  topic: string;
  genre?: string;
  summary?: string;
  speakers?: string;
  tone: string;
  pronouns: string;
  voiceRules?: string[];
  glossary: string[];
};

const STYLE_CARD_SYSTEM =
  "Bạn là đạo diễn thuyết minh (voice-over) tiếng Việt chuyên nghiệp. " +
  "Hãy đọc kỹ tiêu đề và toàn bộ kịch bản phụ đề của video YouTube, nắm rõ bối cảnh, người nói, mạch nội dung và sắc thái cảm xúc từ đầu đến cuối, " +
  "rồi trả về JSON cẩm nang dịch để biên dịch viên Việt hóa lời thoại tự nhiên, đồng nhất cả video:\n" +
  "{\n" +
  '  "topic": "chủ đề video trong 1 câu ngắn",\n' +
  '  "genre": "thể loại cụ thể (vd: vlog cá nhân, review, phim tài liệu, tin tức, phỏng vấn/podcast, hướng dẫn thực tế, kể chuyện, hài/châm biếm…)",\n' +
  '  "summary": "tóm tắt mạch nội dung chính từ đầu đến cuối trong 2–3 câu để biên dịch viên hiểu ngữ cảnh, ẩn dụ và kết luận",\n' +
  '  "speakers": "mô tả người nói (vd: 1 người dẫn chuyện nói với khán giả; hoặc hội thoại 2 người: MC và khách mời…)",\n' +
  '  "tone": "văn phong thuyết minh cụ thể (vd: gần gũi tự nhiên kiểu YouTuber chia sẻ, trầm lắng sâu sắc kiểu phim tài liệu, sắc sảo gọn gàng kiểu bản tin…)",\n' +
  '  "pronouns": "quy ước xưng hô thống nhất cho từng vai (vd: mình – các bạn, tôi – mọi người, anh – em, ông ấy/cô ấy…)",\n' +
  '  "voiceRules": ["3–4 quy tắc văn nói tiếng Việt riêng cho video này (vd: có dùng từ nối/tiểu từ khẩu ngữ như thật ra, đấy, nha không; nhịp nhanh hay điềm đạm…)"],\n' +
  '  "glossary": ["tối đa 12 thuật ngữ, tên riêng hoặc cụm từ lặp lại quan trọng cần giữ nguyên/dịch thống nhất dạng \'gốc -> cách dịch\'"]\n' +
  "}";

function isStyleCard(x: unknown): x is DubStyleCard {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.topic === "string" && typeof o.tone === "string" && typeof o.pronouns === "string";
}

const STYLE_SCRIPT_MAX_CHARS = 24_000;

/**
 * Chuẩn bị toàn bộ phụ đề cho bước đọc hiểu trước khi dịch.
 * Video ≤ ~30–35 phút gửi trọn vẹn 100%; video quá dài thì lấy trọn phần mở đầu + rải đều toàn trục + phần kết.
 */
function buildTranscriptForStyle(items: DubTranslateItem[]): { transcript: string; truncated: boolean } {
  const lines = items.map((x) => x.text.trim()).filter(Boolean);
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
): Promise<DubStyleCard | null> {
  if (items.length <= 3) return null;
  const { transcript, truncated } = buildTranscriptForStyle(items);
  const prefer = process.env.DUB_TRANSLATE_PREFER === "openai" ? "openai" : "large";
  try {
    const card = await chatJson<DubStyleCard>(
      STYLE_CARD_SYSTEM,
      {
        title: title || "(không có tiêu đề)",
        sourceLang,
        totalLines: items.length,
        ...(truncated ? { note: "Video dài nên đã trích rải đều từ đầu đến cuối; [...] là đoạn lược bớt." } : {}),
        transcript,
      },
      isStyleCard,
      { prefer, timeoutMs: 18_000 },
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
      tone: card.tone.trim().slice(0, 180),
      pronouns: card.pronouns.trim().slice(0, 140),
      voiceRules: cleanList(card.voiceRules, 5),
      glossary: cleanList(card.glossary, 12),
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
) => {
  const ctxLines = [
    title ? `- Tiêu đề video: "${title}"` : "",
    style?.genre ? `- Thể loại: ${style.genre}` : "",
    style?.topic ? `- Chủ đề: ${style.topic}` : "",
    style?.summary ? `- Mạch nội dung toàn video: ${style.summary}` : "",
    style?.speakers ? `- Người nói: ${style.speakers}` : "",
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

  return (
    `Bạn là biên dịch viên thuyết minh video (voice-over) tiếng Việt chuyên nghiệp, Việt hóa phụ đề từ ngôn ngữ "${lang}" sang tiếng Việt tự nhiên như người bản xứ nói.\n` +
    (ctxLines ? `Cẩm nang toàn video (đã đọc hết kịch bản):\n${ctxLines}\n` : "") +
    exampleBlock +
    "Đầu vào JSON gồm:\n" +
    '- "prev" (tuỳ chọn): vài câu ngay trước đó — chỉ để nối mạch và giữ đúng xưng hô, KHÔNG dịch lại.\n' +
    '- "items": danh sách câu cần dịch dạng {"1": {"s": số giây, "max": số từ tiếng Việt tham khảo, "text": câu gốc}, …}.\n' +
    '- "next" (tuỳ chọn): vài câu tiếp theo — chỉ để biết mạch câu sắp nói, KHÔNG dịch lại.\n' +
    "Quy tắc bắt buộc:\n" +
    "1. Việt hóa lời thoại tự nhiên (KHÔNG dịch máy từng chữ): diễn đạt lại theo cách người Việt nói/dẫn chuyện thật, giữ trọn ý, cảm xúc và sắc thái của người nói.\n" +
    "2. Tránh bệnh dịch khô kiểu Tây: KHÔNG dịch cứng 'Es ist / It is' thành 'Nó là…'; chuyển câu bị động Tây ('được làm bởi…') sang câu chủ động tự nhiên; tách hoặc đảo lại mệnh đề quan hệ/cụm danh từ dài cho thuận tai. Chuyển thành ngữ và từ đệm (halt, quasi, eben, basically, you know…) sang từ nối hoặc tiểu từ tiếng Việt phù hợp với văn phong video.\n" +
    "3. Giữ đúng xưng hô và mạch nối dựa vào mẫu phần mở đầu, cẩm nang và `prev`/`next`; nếu là hội thoại nhiều người, phân biệt rõ vai nói.\n" +
    "4. Tối ưu cho giọng đọc AI (TTS) và thời lượng: dùng dấu phẩy, chấm, hỏi, than đúng nhịp thở để giọng đọc có cảm xúc; giữ độ dài gọn quanh mức `max` từ nhưng ưu tiên câu trôi chảy (đừng cắt cụt từ nối làm câu bị khô). Viết số, đơn vị, ký hiệu theo cách đọc tự nhiên (vd: '25%' → '25 phần trăm', '€50' → '50 euro', 'km/h' → 'ki-lô-mét trên giờ'), không để chú thích trong ngoặc.\n" +
    "5. Giữ ĐÚNG số lượng và thứ tự khóa trong `items` (1..N), tuyệt đối không gộp hay bỏ sót câu.\n" +
    'Trả về đúng JSON {"t": {"1": "...", "2": "...", …}}, không giải thích.'
  );
};

async function callSmartDubProvider(
  p: Provider,
  systemPrompt: string,
  payload: object,
  expectedCount: number,
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
      signal: AbortSignal.timeout(35_000),
    });
    // Rate limit ngắn → đợi nhanh tối đa 2 lần rồi thử lại, nếu vẫn 429 thì nhường provider kế tiếp
    if (res.status === 429 && attempt < 2) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 1.5 * (attempt + 1), 6);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
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
): Promise<string[]> {
  const list = dubProviders();
  if (!list.length) throw new Error("Server chưa cấu hình AI để dịch.");

  const result = chunk.map(() => "");
  let todo = chunk.map((_, i) => i);
  let formatError = false;

  const makePayload = (indices: number[]) => ({
    ...(prevCtx.length ? { prev: prevCtx } : {}),
    items: Object.fromEntries(
      indices.map((idx, pos) => {
        const it = chunk[idx];
        const s = Math.max(0.6, Math.round(it.availSec * 10) / 10);
        // Giọng thuyết minh Việt ở 1.1x đọc tự nhiên ~4.4 từ/giây → nới trần đến 120 từ cho câu dài trọn vẹn
        const max = Math.max(5, Math.min(120, Math.round(s * 4.4)));
        return [pos + 1, { s, max, text: it.text }];
      }),
    ),
    ...(nextCtx.length ? { next: nextCtx } : {}),
  });

  for (const p of list) {
    if (!todo.length) break;
    try {
      const out = await callSmartDubProvider(p, systemPrompt, makePayload(todo), todo.length);
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
      const partPrev = first > 0 ? chunk.slice(Math.max(0, first - 2), first).map((x) => x.text) : prevCtx;
      const partNext = last < chunk.length - 1 ? chunk.slice(last + 1, last + 3).map((x) => x.text) : nextCtx;
      const sub = await translateSmartDubChunk(
        part.map((i) => chunk[i]),
        partPrev,
        partNext,
        systemPrompt,
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
): Promise<string[]> {
  try {
    return await translateSmartDubChunk(chunk, prevCtx, nextCtx, systemPrompt);
  } catch (e) {
    console.error("[dub-smart] lô lỗi, thử lại:", (e as Error).message);
    await new Promise((r) => setTimeout(r, CHUNK_RETRY_DELAY_MS));
    return translateSmartDubChunk(chunk, prevCtx, nextCtx, systemPrompt);
  }
}

const CHUNK_RETRY_DELAY_MS = 2_500;
/** Thời hạn chờ đọc toàn bộ phụ đề sinh Style Bible trước khi bỏ qua để không treo lô đầu. */
const STYLE_CARD_DEADLINE_MS = 14_000;

const FIRST_DUB_BATCH = 10; // Lô đầu 10 câu (~45–60s đầu) dịch siêu nhanh (~1.5–2.5s) để mở video gần như tức thì
const NEXT_DUB_BATCH = 25; // Các lô sau 25 câu — cân bằng giữa tốc độ và tránh chạm trần TPM / cắt cụt JSON
const DUB_CONCURRENCY = 3; // 3 luồng song song giúp bám sát giới hạn TPM của Groq 120b, giảm rớt lô 429

/** Chọn 4–5 cặp câu tiêu biểu đã dịch ở lô đầu làm mẫu giọng văn & xưng hô cho các lô song song phía sau. */
function pickStyleExamples(items: DubTranslateItem[], translations: string[], count: number): StyleExample[] {
  const candidates: StyleExample[] = [];
  for (let i = 0; i < count; i++) {
    const orig = items[i]?.text.trim() ?? "";
    const vi = translations[i]?.trim() ?? "";
    if (orig.length >= 20 && vi.length >= 15) {
      candidates.push({ orig: orig.slice(0, 180), vi: vi.slice(0, 200) });
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
 * - Bước 1: Đọc toàn bộ phụ đề để sinh Cẩm nang văn phong (Style Bible: chủ đề, thể loại, mạch truyện, người nói, xưng hô, quy tắc văn nói, thuật ngữ).
 * - Bước 2: Dịch ngay lô đầu 20 câu bằng mô hình lớn (Groq 120b → OpenAI) → gọi `onChunk` để phát video liền.
 * - Bước 3: Lấy 4–5 cặp câu tiêu biểu của lô đầu làm mẫu neo văn phong, chạy song song các lô còn lại
 *   (kèm 2 câu trước + 2 câu sau + ngân sách từ theo thời lượng), cập nhật từng lô qua `onChunk` và `onProgress`.
 */
export async function translateForDubbingSmart(
  items: DubTranslateItem[],
  {
    title = "",
    sourceLang = "auto",
    onProgress,
    onChunk,
  }: {
    title?: string;
    sourceLang?: string;
    onProgress?: (info: { phase: "style" | "translate"; done: number; total: number }) => void;
    onChunk?: (info: { start: number; translations: string[]; done: number; total: number }) => void;
  } = {},
): Promise<{ translations: string[]; style: DubStyleCard | null }> {
  const lang = (sourceLang || "auto").toLowerCase();
  if (!items.length || lang === "vi" || lang.startsWith("vi-")) {
    return { translations: items.map((x) => x.text), style: null };
  }

  // Khởi chạy phân tích cẩm nang văn phong (Style Bible) SONG SONG với lô đầu tiên (10 câu mở đầu)
  // thay vì chặn chờ 4–10 giây trước khi bắt đầu dịch → mở trình phát nhanh hơn gấp 3–4 lần,
  // trong khi toàn bộ các lô tiếp theo vẫn hưởng trọn Style Bible + mẫu câu từ lô đầu.
  const stylePromise =
    items.length > FIRST_DUB_BATCH
      ? Promise.race([
          buildDubStyleCard(items, title, sourceLang || "auto"),
          new Promise<null>((r) => setTimeout(() => r(null), STYLE_CARD_DEADLINE_MS)),
        ])
      : Promise.resolve<DubStyleCard | null>(null);

  const initialPrompt = SMART_DUB_SYSTEM(sourceLang || "auto", title, null);
  const out: string[] = new Array(items.length);
  onProgress?.({ phase: "translate", done: 0, total: items.length });

  // Chia lô: lô đầu nhỏ (10 câu) để phát tức thì, các lô sau 30 câu chạy song song
  const ranges: { start: number; end: number }[] = [];
  if (items.length > 0) {
    const firstEnd = Math.min(items.length, FIRST_DUB_BATCH);
    ranges.push({ start: 0, end: firstEnd });
    for (let s = firstEnd; s < items.length; s += NEXT_DUB_BATCH) {
      ranges.push({ start: s, end: Math.min(items.length, s + NEXT_DUB_BATCH) });
    }
  }

  let doneCount = 0;

  const runRange = async (r: { start: number; end: number }, prompt: string, mustSucceed = false) => {
    const chunk = items.slice(r.start, r.end);
    const prevCtx = items.slice(Math.max(0, r.start - 2), r.start).map((x) => x.text);
    const nextCtx = items.slice(r.end, r.end + 2).map((x) => x.text);
    let translated: string[];
    try {
      translated = await translateSmartDubChunkRetry(chunk, prevCtx, nextCtx, prompt);
    } catch (e) {
      // Lô đầu hỏng thì chưa có gì để phát → báo lỗi. Lô sau hỏng thì để trống, các lô khác dịch tiếp.
      if (mustSucceed) throw e;
      console.error(`[dub-smart] bỏ lô ${r.start}-${r.end}:`, (e as Error).message);
      translated = chunk.map(() => "");
    }
    translated.forEach((t, k) => {
      out[r.start + k] = t;
    });
    doneCount += chunk.length;
    onChunk?.({ start: r.start, translations: translated, done: doneCount, total: items.length });
    onProgress?.({ phase: "translate", done: doneCount, total: items.length });
  };

  // Lô 0 chạy ngay lập tức (song song với Style Bible) để trình phát mở sau ~2 giây
  if (ranges.length > 0) {
    await runRange(ranges[0], initialPrompt, true);
  }

  const style = await stylePromise;

  // Các lô còn lại chạy song song, kèm đầy đủ Style Bible + 4–5 câu mẫu từ lô 0 để đồng bộ giọng văn & xưng hô
  const rest = ranges.slice(1);
  if (rest.length > 0) {
    const examples = pickStyleExamples(items, out, ranges[0].end);
    const restPrompt = SMART_DUB_SYSTEM(sourceLang || "auto", title, style, examples);
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(DUB_CONCURRENCY, rest.length) }, async () => {
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
 * Gom các chỉ số liền nhau thành lô ≤ 25 câu, kèm 2 câu trước/sau và mẫu văn phong từ các câu đã dịch sẵn.
 * Trả về Map chỉ số → bản dịch (chỉ những câu dịch được).
 */
export async function translateDubRepair(
  items: DubTranslateItem[],
  indices: number[],
  {
    title = "",
    sourceLang = "auto",
    style = null,
    styleExamples = [],
    onChunk,
  }: {
    title?: string;
    sourceLang?: string;
    style?: DubStyleCard | null;
    styleExamples?: StyleExample[];
    onChunk?: (info: { start: number; translations: string[]; done: number; total: number }) => void;
  } = {},
): Promise<Map<number, string>> {
  const fixed = new Map<number, string>();
  const sorted = [...new Set(indices)].filter((i) => i >= 0 && i < items.length).sort((a, b) => a - b);
  if (!sorted.length) return fixed;

  const groups: number[][] = [];
  for (const i of sorted) {
    const g = groups[groups.length - 1];
    if (g && i === g[g.length - 1] + 1 && g.length < NEXT_DUB_BATCH) g.push(i);
    else groups.push([i]);
  }

  const systemPrompt = SMART_DUB_SYSTEM(sourceLang || "auto", title, style, styleExamples);
  let cursor = 0;
  let repairedDone = 0;
  await Promise.all(
    Array.from({ length: Math.min(DUB_CONCURRENCY, groups.length) }, async () => {
      while (cursor < groups.length) {
        const g = groups[cursor++];
        const first = g[0];
        const last = g[g.length - 1];
        const prevCtx = items.slice(Math.max(0, first - 2), first).map((x) => x.text);
        const nextCtx = items.slice(last + 1, last + 3).map((x) => x.text);
        const out = await translateSmartDubChunkRetry(
          g.map((i) => items[i]),
          prevCtx,
          nextCtx,
          systemPrompt,
        ).catch(() => null);
        const groupTranslations = g.map((idx, k) => {
          const tr = out?.[k] || "";
          if (tr) fixed.set(idx, tr);
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
  opts: { prefer?: "openai" | "large"; timeoutMs?: number } = {},
): Promise<T & { provider: string }> {
  const all = providers();
  // prefer "openai": ChatGPT trước (chậm hơn nhưng tiếng Việt tự nhiên nhất) → Groq lớn → Groq nhỏ
  // prefer "large":  Groq lớn trước (nhanh, đủ chính xác cho nội dung dài) → ChatGPT → Groq nhỏ
  const small = process.env.TRANSLATE_MODEL ?? "openai/gpt-oss-20b";
  const rank = (p: Provider) =>
    p.model === small ? 2 : opts.prefer === "openai" ? (p.name === "openai" ? 0 : 1) : p.name === "openai" ? 1 : 0;
  const list = opts.prefer ? [...all].sort((a, b) => rank(a) - rank(b)) : all;
  if (!list.length) throw new Error("Server chưa cấu hình AI để dịch.");
  for (const p of list) {
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
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data: { choices?: { message?: { content?: string } }[] } = await res.json();
      const parsed: unknown = parseJsonLoose(data.choices?.[0]?.message?.content ?? "{}");
      if (valid(parsed)) return { ...parsed, provider: p.name };
      throw new Error(`${p.name}: trả về sai định dạng`);
    } catch (e) {
      console.error("[chatJson]", (e as Error).message);
    }
  }
  throw new Error("Không dịch được lúc này.");
}
