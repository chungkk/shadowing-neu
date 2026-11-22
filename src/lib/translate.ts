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

/**
 * Bản dịch có thật là tiếng Việt không? Mô hình nhỏ đôi khi chép lại nguyên câu tiếng Đức.
 * Câu ngắn (≤ 2 từ: "Okay.", "Berlin!") giữ nguyên cũng được.
 */
export function looksTranslated(source: string, translation: string): boolean {
  const t = translation.trim();
  if (!t) return false;
  if (source.trim().split(/\s+/).length <= 2) return true;
  const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return norm(t) !== norm(source) && VI_CHARS.test(t);
}

const keyOf = (text: string) => "vi:" + createHash("sha1").update(text.trim()).digest("hex");

async function callProvider(p: Provider, sentences: string[], systemPrompt = PROMPT): Promise<string[]> {
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
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data: { choices?: { message?: { content?: string } }[] } = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  // Thiếu câu nào = mô hình đã gộp câu → các bản dịch phía sau có thể bị lệch, bỏ cả lô
  const t: unknown = parsed.t;
  const out = sentences.map((_, i) => {
    const x = Array.isArray(t) ? (t.length === sentences.length ? t[i] : undefined) : (t as Record<string, unknown>)?.[i + 1];
    return typeof x === "string" ? x.trim() : undefined;
  });
  if (!out.every((x) => x !== undefined)) {
    throw new FormatError(`${p.name}: trả về sai định dạng (${out.filter((x) => x !== undefined).length}/${sentences.length} câu)`);
  }
  return out as string[];
}

class FormatError extends Error {}

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
  tone: string;
  pronouns: string;
  glossary: string[];
};

const STYLE_CARD_SYSTEM =
  "Bạn là đạo diễn thuyết minh tiếng Việt chuyên nghiệp. Đọc tiêu đề và một đoạn trích phụ đề của video YouTube, " +
  "rồi trả về JSON tóm tắt phong cách dịch để các biên dịch viên dịch nhất quán cả video:\n" +
  '{"topic": "chủ đề ngắn gọn trong 1 câu", "tone": "văn phong thuyết minh (vd: thân mật kiểu vlog, trang trọng kiểu tin tức, lôi cuốn kiểu phim tài liệu…)", ' +
  '"pronouns": "quy ước xưng hô thống nhất (vd: mình – các bạn, tôi – quý vị, anh ấy/cô ấy…)", ' +
  '"glossary": ["thuật ngữ hoặc tên riêng quan trọng cần giữ nguyên/dịch thống nhất (tối đa 10 mục)"]}';

function isStyleCard(x: unknown): x is DubStyleCard {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.topic === "string" && typeof o.tone === "string" && typeof o.pronouns === "string";
}

async function buildDubStyleCard(
  items: DubTranslateItem[],
  title: string,
  sourceLang: string,
): Promise<DubStyleCard | null> {
  if (items.length <= 5) return null;
  const head = items.slice(0, 14).map((x) => x.text);
  const midStart = Math.max(14, Math.floor(items.length / 2) - 2);
  const mid = items.length > 22 ? items.slice(midStart, midStart + 6).map((x) => x.text) : [];
  try {
    const card = await chatJson<DubStyleCard>(
      STYLE_CARD_SYSTEM,
      { title: title || "(không có tiêu đề)", sourceLang, opening: head, ...(mid.length ? { middleSample: mid } : {}) },
      isStyleCard,
      { prefer: "large", timeoutMs: 20_000 },
    );
    return {
      topic: card.topic.trim().slice(0, 200),
      tone: card.tone.trim().slice(0, 160),
      pronouns: card.pronouns.trim().slice(0, 120),
      glossary: Array.isArray(card.glossary)
        ? card.glossary.filter((g): g is string => typeof g === "string" && !!g.trim()).slice(0, 10)
        : [],
    };
  } catch (e) {
    console.error("[dub-style-card]", (e as Error).message);
    return null;
  }
}

const SMART_DUB_SYSTEM = (lang: string, title: string, style: DubStyleCard | null) => {
  const ctxLines = [
    title ? `- Tiêu đề video: "${title}"` : "",
    style?.topic ? `- Chủ đề: ${style.topic}` : "",
    style?.tone ? `- Văn phong: ${style.tone}` : "",
    style?.pronouns ? `- Xưng hô thống nhất: ${style.pronouns}` : "",
    style?.glossary?.length ? `- Thuật ngữ / tên riêng: ${style.glossary.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    `Bạn là biên dịch viên thuyết minh video (voice-over) chuyên nghiệp từ ngôn ngữ "${lang}" sang tiếng Việt.\n` +
    (ctxLines ? `Ngữ cảnh toàn video:\n${ctxLines}\n` : "") +
    "Đầu vào JSON gồm:\n" +
    '- "prev" (tuỳ chọn): vài câu ngay trước đó kèm bản dịch tiếng Việt — chỉ để nối mạch và giữ đúng xưng hô, KHÔNG dịch lại.\n' +
    '- "items": danh sách câu cần dịch dạng {"1": {"s": số giây, "max": số từ tiếng Việt tối đa nên dùng, "text": câu gốc}, …}.\n' +
    '- "next" (tuỳ chọn): vài câu tiếp theo — chỉ để biết mạch câu sắp nói, KHÔNG dịch lại.\n' +
    "Quy tắc bắt buộc:\n" +
    "1. Dịch sang tiếng Việt tự nhiên như lời nói, mạch lạc, đúng ngữ cảnh và giữ đúng xưng hô của video.\n" +
    "2. Căn khớp thời lượng: giữ mỗi câu súc tích quanh hoặc dưới mức `max` từ tiếng Việt để giọng đọc kịp khớp hình, bỏ từ đệm thừa nhưng giữ đủ ý chính.\n" +
    "3. Viết số, đơn vị, ký hiệu theo cách đọc tự nhiên bằng giọng AI (vd: '25%' → '25 phần trăm', '€50' → '50 euro', 'km/h' → 'ki-lô-mét trên giờ'). Không để ký tự thừa hay chú thích trong ngoặc.\n" +
    "4. Giữ ĐÚNG số lượng và thứ tự khóa trong `items` (1..N), tuyệt đối không gộp hay bỏ sót câu.\n" +
    'Trả về đúng JSON {"t": {"1": "...", "2": "...", …}}, không giải thích.'
  );
};

async function callSmartDubProvider(
  p: Provider,
  systemPrompt: string,
  payload: object,
  expectedCount: number,
): Promise<string[]> {
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
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data: { choices?: { message?: { content?: string } }[] } = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  const t: unknown = parsed.t;
  const out = Array.from({ length: expectedCount }, (_, i) => {
    const x = Array.isArray(t) ? (t.length === expectedCount ? t[i] : undefined) : (t as Record<string, unknown>)?.[i + 1];
    return typeof x === "string" ? x.trim() : undefined;
  });
  if (!out.every((x) => x !== undefined)) {
    throw new FormatError(`${p.name}: trả về sai định dạng (${out.filter((x) => x !== undefined).length}/${expectedCount} câu)`);
  }
  return out as string[];
}

function dubProviders(): Provider[] {
  const all = providers();
  const small = process.env.TRANSLATE_MODEL ?? "openai/gpt-oss-20b";
  // Ưu tiên mô hình lớn (Groq 120b → OpenAI → Groq 20b) để dịch mượt, giữ xưng hô & căn thời lượng chuẩn
  const rank = (p: Provider) => (p.model === small ? 2 : p.name === "openai" ? 1 : 0);
  return [...all].sort((a, b) => rank(a) - rank(b));
}

async function translateSmartDubChunk(
  chunk: DubTranslateItem[],
  prevCtx: { orig: string; vi: string }[],
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
        // Kokoro đọc tự nhiên ở ~3.8 từ tiếng Việt / giây → đặt trần gọn gàng
        const max = Math.max(4, Math.min(48, Math.round(s * 3.8)));
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
      const sub = await translateSmartDubChunk(
        part.map((i) => chunk[i]),
        prevCtx,
        nextCtx,
        systemPrompt,
      ).catch(() => null);
      part.forEach((idx, k) => {
        if (sub?.[k]) result[idx] = sub[k];
      });
    }
    todo = todo.filter((idx) => !result[idx]);
  }

  if (todo.length === chunk.length) throw new Error("Không dịch được lúc này.");
  return result.map((r, i) => r || chunk[i].text);
}

const SMART_DUB_BATCH = 20;

/**
 * Dịch thuyết minh thông minh (Combo 1 + 2 + 3):
 * - Bước 1: Sinh Style Card (chủ đề, văn phong, xưng hô, bảng thuật ngữ) từ tiêu đề + trích đoạn video.
 * - Bước 2: Dịch theo cửa sổ trượt (gửi kèm 3 câu trước đã dịch + 2 câu sau làm lookahead)
 *   và căn ngân sách số từ theo thời lượng từng câu để giọng đọc khớp hình, tự nhiên.
 */
export async function translateForDubbingSmart(
  items: DubTranslateItem[],
  { title = "", sourceLang = "auto" }: { title?: string; sourceLang?: string } = {},
): Promise<{ translations: string[]; style: DubStyleCard | null }> {
  const lang = (sourceLang || "auto").toLowerCase();
  if (!items.length || lang === "vi" || lang.startsWith("vi-")) {
    return { translations: items.map((x) => x.text), style: null };
  }

  const style = await buildDubStyleCard(items, title, sourceLang || "auto");
  const systemPrompt = SMART_DUB_SYSTEM(sourceLang || "auto", title, style);
  const out: string[] = new Array(items.length);

  for (let i = 0; i < items.length; i += SMART_DUB_BATCH) {
    const chunk = items.slice(i, i + SMART_DUB_BATCH);
    const prevCtx: { orig: string; vi: string }[] = [];
    for (let p = Math.max(0, i - 3); p < i; p++) {
      if (out[p]) prevCtx.push({ orig: items[p].text, vi: out[p] });
    }
    const nextCtx = items.slice(i + SMART_DUB_BATCH, i + SMART_DUB_BATCH + 2).map((x) => x.text);

    const translated = await translateSmartDubChunk(chunk, prevCtx, nextCtx, systemPrompt);
    translated.forEach((t, k) => {
      out[i + k] = t;
    });
  }

  return { translations: out, style };
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

  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    const res = await translateBatch(chunk);
    // Chỉ lưu câu dịch được; câu hỏng lần sau sẽ thử lại
    const rows = chunk
      .map((text, k) => ({ key: keyOf(text), text, translation: res[k].out, provider: res[k].provider }))
      .filter((r) => r.translation);
    saveTranslations(rows);
    for (const r of rows) cached.set(r.key, r.translation);
  }
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
      const parsed: unknown = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
      if (valid(parsed)) return { ...parsed, provider: p.name };
      throw new Error(`${p.name}: trả về sai định dạng`);
    } catch (e) {
      console.error("[chatJson]", (e as Error).message);
    }
  }
  throw new Error("Không dịch được lúc này.");
}
