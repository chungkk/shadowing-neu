import "server-only";
import { createHash } from "node:crypto";
import { getTranslations, saveTranslations } from "./db";

/**
 * Dịch câu tiếng Đức → tiếng Việt, rẻ nhất có thể:
 *   1. Kho bản dịch trong SQLite (mỗi câu chỉ dịch 1 lần, dùng chung mọi bài / người học)
 *   2. Mô hình nhỏ trên Groq (dùng chung key với Whisper)
 *   3. ChatGPT (OpenAI) làm dự phòng khi Groq lỗi / hết lượt
 * Cả hai đều lỗi → ném lỗi; giao diện vẫn còn link Google Translate.
 *
 * Biến môi trường (tuỳ chọn):
 * - TRANSLATE_MODEL           mô hình Groq (mặc định "openai/gpt-oss-20b")
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
    list.push({
      name: "groq",
      url: groqUrl,
      key: groqKey,
      model: process.env.TRANSLATE_MODEL ?? "openai/gpt-oss-20b",
      extra: { reasoning_effort: "low", temperature: 0.2 },
    });
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

/** Thử lần lượt từng nhà cung cấp cho 1 lô câu */
async function translateBatch(sentences: string[]): Promise<{ out: string[]; provider: string }> {
  const errors: string[] = [];
  for (const p of providers()) {
    try {
      return { out: await callProvider(p, sentences), provider: p.name };
    } catch (e) {
      errors.push((e as Error).message);
      console.error("[translate]", (e as Error).message);
    }
  }
  throw new Error(errors.length ? "Không dịch được lúc này." : "Server chưa cấu hình AI để dịch.");
}

/** Dịch danh sách câu (giữ thứ tự). Câu đã có trong kho thì không gọi AI. */
export async function translateSentences(sentences: string[]): Promise<string[]> {
  const keys = sentences.map(keyOf);
  const cached = getTranslations(keys);
  const missing = [...new Set(sentences.filter((_, i) => !cached.has(keys[i])).map((s) => s.trim()))].filter(Boolean);

  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    const { out, provider } = await translateBatch(chunk);
    const rows = chunk.map((text, k) => ({ key: keyOf(text), text, translation: out[k], provider }));
    saveTranslations(rows);
    for (const r of rows) cached.set(r.key, r.translation);
  }
  return keys.map((k) => cached.get(k) ?? "");
}
