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
    list.push({
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-5-mini",
    });
  }
  return list;
}

export const translationEnabled = () => providers().length > 0;

const PROMPT =
  "Bạn là người dịch phụ đề tiếng Đức sang tiếng Việt cho người học tiếng Đức. " +
  'Nhận JSON {"s": [câu 1, câu 2, …]} là các câu liên tiếp trong một video. ' +
  "Dịch từng câu sang tiếng Việt tự nhiên, sát nghĩa, dựa vào ngữ cảnh các câu xung quanh. " +
  'Trả về đúng JSON {"t": [bản dịch 1, bản dịch 2, …]} với ĐÚNG số phần tử và đúng thứ tự, không giải thích.';

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

async function callProvider(p: Provider, sentences: string[]): Promise<string[]> {
  const res = await fetch(p.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
    body: JSON.stringify({
      model: p.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: JSON.stringify({ s: sentences }) },
      ],
      ...p.extra,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data: { choices?: { message?: { content?: string } }[] } = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  const t: unknown = parsed.t;
  if (!Array.isArray(t) || t.length !== sentences.length || !t.every((x) => typeof x === "string")) {
    throw new Error(`${p.name}: trả về sai định dạng (${Array.isArray(t) ? t.length : "?"}/${sentences.length} câu)`);
  }
  return t.map((x: string) => x.trim());
}

/**
 * Dịch 1 lô câu: thử lần lượt từng nhà cung cấp; câu nào chưa ra tiếng Việt thì gửi riêng
 * cho nhà cung cấp kế tiếp. Trả về bản dịch ("" = chưa dịch được) + tên nhà cung cấp.
 */
async function translateBatch(sentences: string[]): Promise<{ out: string; provider: string }[]> {
  const result = sentences.map(() => ({ out: "", provider: "" }));
  let todo = sentences.map((_, i) => i);
  const errors: string[] = [];
  const list = providers();
  if (!list.length) throw new Error("Server chưa cấu hình AI để dịch.");

  for (const p of list) {
    if (!todo.length) break;
    try {
      const out = await callProvider(
        p,
        todo.map((i) => sentences[i]),
      );
      todo.forEach((i, k) => {
        if (looksTranslated(sentences[i], out[k])) result[i] = { out: out[k], provider: p.name };
      });
      todo = todo.filter((i) => !result[i].out);
      if (todo.length) console.error(`[translate] ${p.name}: ${todo.length} câu chưa dịch, thử tiếp`);
    } catch (e) {
      errors.push((e as Error).message);
      console.error("[translate]", (e as Error).message);
    }
  }
  if (todo.length === sentences.length) throw new Error("Không dịch được lúc này.");
  return result;
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
  opts: { prefer?: "openai" | "large" } = {},
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
        signal: AbortSignal.timeout(30_000),
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
