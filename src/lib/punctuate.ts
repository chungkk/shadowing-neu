import "server-only";
import type { Segment } from "./subtitles";

/**
 * Thêm dấu câu cho phụ đề tự động của YouTube (nhiều video không có dấu chấm, phẩy nào
 * → không chia được thành câu). Gửi phần CHỮ (không gửi audio) cho một mô hình ngôn ngữ
 * tương thích OpenAI (mặc định Groq, dùng chung key với Whisper), rồi ráp dấu câu /
 * chữ hoa trở lại đúng từng từ gốc — chữ và thời gian từng từ giữ nguyên như YouTube.
 *
 * Biến môi trường (tuỳ chọn):
 * - PUNCTUATE_MODEL    mô hình (mặc định "openai/gpt-oss-120b"; đặt "off" để tắt)
 * - PUNCTUATE_API_URL  endpoint chat completions (mặc định suy ra từ TRANSCRIBE_API_URL)
 */
const MODEL = process.env.PUNCTUATE_MODEL ?? "openai/gpt-oss-120b";
const API_KEY = process.env.PUNCTUATE_API_KEY ?? process.env.TRANSCRIBE_API_KEY;
const API_URL =
  process.env.PUNCTUATE_API_URL ??
  process.env.TRANSCRIBE_API_URL?.replace(/\/audio\/transcriptions$/, "/chat/completions") ??
  "https://api.groq.com/openai/v1/chat/completions";

const CHUNK = 300; // số từ mỗi lần gửi
const OVERLAP = 40; // gửi thêm vài chục từ phía sau làm ngữ cảnh, để cuối khúc không bị chấm sai
const PARALLEL = 3;

export const punctuationEnabled = () => !!API_KEY && MODEL !== "off";

const PROMPT =
  "Du setzt Satzzeichen in automatisch erzeugte deutsche Untertitel. Füge Punkt, Komma, Fragezeichen " +
  "und Ausrufezeichen ein und korrigiere die Groß-/Kleinschreibung. Ändere, ergänze oder lösche KEINE " +
  "Wörter und behalte die Reihenfolge exakt bei. Antworte nur mit dem Text.";

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Phụ đề gần như không có dấu kết thúc câu (< 1 dấu / 40 từ) */
export function lacksPunctuation(segs: Segment[]): boolean {
  const words = segs.flatMap((s) => s.text.split(" "));
  if (words.length < 30) return false;
  return words.filter((w) => /[.!?…]["»“”']?$/.test(w)).length < words.length / 40;
}

/**
 * Ghép kết quả của mô hình vào từ gốc bằng LCS (mô hình đôi khi bỏ / gộp / sửa 1 từ):
 * từ khớp → lấy bản có dấu câu + chữ hoa; không khớp → giữ nguyên từ gốc.
 */
function align(original: string[], output: string[]): string[] {
  const a = original.map(norm);
  const b = output.map(norm);
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] && a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const result = [...original];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] && a[i] === b[j]) {
      result[i] = output[j];
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return result;
}

async function callModel(text: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    // Gói miễn phí giới hạn số request / phút → chờ rồi thử lại
    if (res.status === 429 && attempt < 3) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 2 ** attempt * 2, 20);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Lỗi API thêm dấu câu (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const data: { choices?: { message?: { content?: string } }[] } = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

/** Trả về bản phụ đề có dấu câu (giữ nguyên số từ + thời gian). Lỗi → trả về bản gốc. */
export async function addPunctuation(segs: Segment[]): Promise<Segment[]> {
  const words = segs.flatMap((s) => s.words?.map(([, w]) => w) ?? s.text.split(" "));
  const fixed = [...words];
  const starts = Array.from({ length: Math.ceil(words.length / CHUNK) }, (_, k) => k * CHUNK);

  try {
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL, starts.length) }, async () => {
        while (next < starts.length) {
          const s = starts[next++];
          const input = words.slice(s, s + CHUNK + OVERLAP);
          const aligned = align(input, (await callModel(input.join(" "))).split(/\s+/));
          // Chỉ nhận phần chính của khúc; phần OVERLAP do khúc sau xử lý
          for (let k = 0; k < Math.min(CHUNK, input.length); k++) fixed[s + k] = aligned[k];
        }
      }),
    );
  } catch (e) {
    console.error("[punctuate]", (e as Error).message);
    return segs;
  }

  // Trả từng từ về đúng dòng / đúng mốc thời gian cũ
  let k = 0;
  return segs.map((s) => {
    if (s.words) {
      const ws = s.words.map(([t]): [number, string] => [t, fixed[k++]]);
      return { ...s, words: ws, text: ws.map(([, w]) => w).join(" ") };
    }
    const n = s.text.split(" ").length;
    const text = fixed.slice(k, k + n).join(" ");
    k += n;
    return { ...s, text };
  });
}
