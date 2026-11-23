import "server-only";
import type { Word } from "./subtitles";

export type DubCue = {
  start_ms: number;
  end_ms: number;
  text: string;
};

export type DubCueInput = DubCue & {
  /** Thời gian từng từ (giây) từ YouTube srv3 / Whisper — giúp tách câu chính xác tới từng từ */
  words?: Word[];
};

export type DubVoice = {
  id: string;
  label: string;
  cloned?: boolean;
};

export type DubJob = {
  id: string;
  url: string;
  video_id?: string;
  title: string;
  voice: string;
  output_mode?: "mp3" | "mp4";
  base_speed: number;
  max_speed: number;
  orig_vol: number;
  dub_vol: number;
  max_height: number;
  status: "queued" | "downloading" | "synthesizing" | "mixing" | "done" | "error" | "cancelled";
  stage: string;
  done_cues: number;
  total_cues: number;
  cache_hits: number;
  eta_s: number | null;
  current_text: string;
  error: string | null;
  size_bytes: number;
  stats: Record<string, unknown> | null;
  elapsed_s: number | null;
  created_at: number;
  updated_at: number;
};

export type DubHealth = {
  ok: boolean;
  model_ready: boolean;
  model_error?: string | null;
  precision: string;
  voices_count: number;
  queue_size: number;
};

const DUB_URL = () => (process.env.VIENEU_DUB_URL ?? "").replace(/\/+$/, "");
const DUB_KEY = () => (process.env.VIENEU_DUB_KEY ?? "").trim();

export const dubEnabled = () => Boolean(DUB_URL());

export function dubHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  const key = DUB_KEY();
  if (key) h["X-Api-Key"] = key;
  return h;
}

export async function dubJson<T>(
  pathname: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const base = DUB_URL();
  if (!base) throw new Error("Chưa cấu hình VIENEU_DUB_URL trên server.");
  const res = await fetch(`${base}${pathname}`, {
    method: init.method ?? "GET",
    headers: dubHeaders(init.body !== undefined ? { "Content-Type": "application/json" } : undefined),
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(init.timeoutMs ?? 60_000),
  });
  if (!res.ok) {
    let msg = `VieNeu Dub Service (${res.status})`;
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) msg = data.detail;
    } catch {
      const txt = (await res.text()).slice(0, 300);
      if (txt) msg = txt;
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function dubEndpoint(pathname: string): string {
  const base = DUB_URL();
  if (!base) throw new Error("Chưa cấu hình VIENEU_DUB_URL trên server.");
  return `${base}${pathname}`;
}

function parseAssTimeMs(ts: string): number | null {
  const m = ts.trim().match(/^(\d+):(\d{2}):(\d{2})\.(\d{1,3})$/);
  if (!m) return null;
  const frac = Number((m[4] + "000").slice(0, 3));
  return ((Number(m[1]) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + frac;
}

function parseSrtTimeMs(ts: string): number | null {
  const m = ts.trim().match(/(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})/);
  if (!m) return null;
  const frac = Number((m[4] + "000").slice(0, 3));
  return ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + frac;
}

/** Phân tích file phụ đề .ass / .srt / .vtt thành danh sách cue sạch để đọc thuyết minh. */
export function parseSubtitleText(raw: string): DubCue[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\ufeff/, "");

  if (text.includes("[Events]") && text.includes("Dialogue:")) {
    const lines = text.split("\n");
    let inEvents = false;
    let numFields = 10;
    const idx: Record<string, number> = { start: 1, end: 2, style: 3, text: 9 };
    const all: Array<DubCue & { style: string }> = [];

    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      if (s.startsWith("[") && s.endsWith("]")) {
        inEvents = s.toLowerCase() === "[events]";
        continue;
      }
      if (!inEvents) continue;
      if (s.startsWith("Format:")) {
        const cols = s.slice(7).split(",").map((c) => c.trim().toLowerCase());
        numFields = cols.length;
        cols.forEach((name, i) => {
          idx[name] = i;
        });
        continue;
      }
      if (!s.startsWith("Dialogue:")) continue;
      const body = s.slice(9).trimStart();
      const parts: string[] = [];
      let rest = body;
      for (let i = 0; i < numFields - 1; i++) {
        const comma = rest.indexOf(",");
        if (comma === -1) break;
        parts.push(rest.slice(0, comma));
        rest = rest.slice(comma + 1);
      }
      parts.push(rest);
      if (parts.length < numFields) continue;

      const start = parseAssTimeMs(parts[idx.start ?? 1]);
      const end = parseAssTimeMs(parts[idx.end ?? 2]);
      if (start === null || end === null) continue;
      const style = (parts[idx.style ?? 3] ?? "").trim();
      const cleaned = (parts[idx.text ?? numFields - 1] ?? "")
        .replace(/\{[^}]*\}/g, "")
        .replace(/\\[Nnh]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned) continue;
      all.push({ start_ms: start, end_ms: Math.max(end, start + 100), text: cleaned, style });
    }

    const hasDefault = all.some((c) => c.style === "Default");
    const filtered = hasDefault ? all.filter((c) => c.style === "Default") : all;
    return filtered
      .sort((a, b) => a.start_ms - b.start_ms)
      .map(({ start_ms, end_ms, text: t }) => ({ start_ms, end_ms, text: t }));
  }

  const cues: DubCue[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const ti = lines.findIndex((l) => l.includes("-->"));
    if (ti === -1) continue;
    const [left, right] = lines[ti].split("-->");
    const start = parseSrtTimeMs(left ?? "");
    const end = parseSrtTimeMs(right ?? "");
    if (start === null || end === null) continue;
    const cleaned = lines
      .slice(ti + 1)
      .join(" ")
      .replace(/<[^>]+>|\{[^}]*\}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned || /^[.\-–—♪♫\s]+$/.test(cleaned)) continue;
    cues.push({ start_ms: start, end_ms: Math.max(end, start + 100), text: cleaned });
  }
  return cues.sort((a, b) => a.start_ms - b.start_ms);
}

const CJK_SCRIPT = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/gu;
const DUB_ABBREV = new Set(
  "mr. mrs. ms. dr. prof. st. jr. sr. vs. etc. e.g. i.e. fig. no. vol. approx. z.b. d.h. u.a. usw. bzw. ca. nr. str. evtl. ggf. vgl. bspw. inkl. max. min. mio. mrd. hr. fr. z.t. o.ä. u.ä. sog.".split(
    " ",
  ),
);

function endsDubSentence(text: string): boolean {
  const t = text.trim().replace(/["»«“”'’)\]]+$/, "");
  if (!t) return false;
  if (/[!?…！？。]$/.test(t)) return true;
  if (!t.endsWith(".")) return false;
  const lastWord = t.split(/\s+/).pop()?.toLowerCase() ?? "";
  return !DUB_ABBREV.has(lastWord) && !/^\d{1,2}\.$/.test(lastWord);
}

function endsClause(text: string): boolean {
  return /[,;:—–、，]["»“”'’)\]]*$/.test(text.trim());
}

type DubTok = { start: number; end: number; text: string };

const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Loại phần từ/chữ bị lặp lại ở đầu dòng sau (phụ đề cuộn rolling captions của YouTube). */
function dedupRollingCues(sorted: DubCueInput[], isCjk: boolean): DubCueInput[] {
  const out: DubCueInput[] = [];
  for (const cue of sorted) {
    const prev = out[out.length - 1];
    if (!prev || cue.start_ms - prev.end_ms > 600) {
      out.push(cue);
      continue;
    }

    if (isCjk) {
      const b = prev.text;
      const n = cue.text;
      if (n === b) continue;
      let overlap = 0;
      const maxOverlap = Math.min(16, b.length, n.length);
      for (let k = maxOverlap; k >= 3; k--) {
        if (b.endsWith(n.slice(0, k))) {
          overlap = k;
          break;
        }
      }
      if (overlap > 0) {
        const rest = n.slice(overlap).trim();
        if (!rest) continue;
        const shift = Math.round(((cue.end_ms - cue.start_ms) * overlap) / Math.max(1, n.length));
        out.push({
          start_ms: Math.min(cue.end_ms - 100, cue.start_ms + shift),
          end_ms: cue.end_ms,
          text: rest,
        });
      } else {
        out.push(cue);
      }
      continue;
    }

    const bw = prev.text.split(/\s+/).filter(Boolean);
    const nw = cue.text.split(/\s+/).filter(Boolean);
    const prevEnded = endsDubSentence(prev.text);
    // Nếu dòng trước đã hết câu, chỉ cắt khi lặp nguyên dòng hoặc lặp ≥ 2 từ (tránh cắt "Ja. Ja, genau.")
    const minK = prevEnded && nw.length > 1 ? 2 : 1;
    const maxK = Math.min(8, bw.length, nw.length);
    let overlap = 0;
    for (let k = maxK; k >= minK; k--) {
      let same = true;
      for (let i = 0; i < k; i++) {
        const a = normWord(bw[bw.length - k + i]);
        const b = normWord(nw[i]);
        if (!a || a !== b) {
          same = false;
          break;
        }
      }
      if (same) {
        overlap = k;
        break;
      }
    }
    if (overlap === 0) {
      out.push(cue);
      continue;
    }
    const restWords = nw.slice(overlap);
    if (!restWords.length) continue;
    const strippedWords = cue.words && cue.words.length === nw.length ? cue.words.slice(overlap) : undefined;
    const startMs = strippedWords?.length
      ? Math.max(cue.start_ms, Math.round(strippedWords[0][0] * 1000))
      : Math.min(cue.end_ms - 100, cue.start_ms + Math.round(((cue.end_ms - cue.start_ms) * overlap) / nw.length));
    out.push({
      start_ms: startMs,
      end_ms: cue.end_ms,
      text: restWords.join(" "),
      ...(strippedWords?.length ? { words: strippedWords } : {}),
    });
  }
  return out;
}

/** Tách các dòng phụ đề thành từng từ (hoặc từng câu CJK) có thời gian chính xác để cắt đúng ranh giới câu. */
function tokenizeDubCues(cues: DubCueInput[], isCjk: boolean): DubTok[] {
  const toks: DubTok[] = [];
  for (const cue of cues) {
    if (isCjk) {
      // Tách ngay sau dấu kết thúc câu / dấu phẩy CJK để không dính 2 câu vào nhau
      const parts = cue.text
        .split(/(?<=[。！？!?…、，]["」』”’)\]]*)/)
        .map((s) => s.trim())
        .filter(Boolean);
      const total = parts.reduce((n, p) => n + p.length, 0) || 1;
      let t = cue.start_ms;
      const span = Math.max(150, cue.end_ms - cue.start_ms);
      for (const part of parts) {
        const dt = (span * part.length) / total;
        toks.push({ start: Math.round(t), end: Math.round(t + dt), text: part });
        t += dt;
      }
      continue;
    }

    if (cue.words?.length) {
      const ws = cue.words;
      for (let i = 0; i < ws.length; i++) {
        const [startSec, w, endSec] = ws[i];
        const clean = w.trim();
        if (!clean) continue;
        const start = Math.max(0, Math.round(startSec * 1000));
        const nextStart = i < ws.length - 1 ? Math.round(ws[i + 1][0] * 1000) : cue.end_ms;
        const end =
          endSec === undefined
            ? Math.max(start + 30, nextStart)
            : Math.max(start + 30, Math.min(Math.round((endSec + 0.12) * 1000), Math.max(start + 30, nextStart)));
        toks.push({ start, end, text: clean });
      }
      continue;
    }

    const words = cue.text.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const total = words.reduce((n, w) => n + w.length + 1, 0);
    const span = Math.max(150, cue.end_ms - cue.start_ms);
    let t = cue.start_ms;
    for (const w of words) {
      const dt = (span * (w.length + 1)) / total;
      toks.push({ start: Math.round(t), end: Math.round(t + dt), text: w });
      t += dt;
    }
  }
  return toks;
}

function joinTokens(toks: DubTok[], isCjk: boolean): string {
  if (!isCjk) return toks.map((t) => t.text).join(" ");
  return toks.map((t) => t.text).join("");
}

/**
 * Chỉ cắt khi 1 khối quá dài vượt trần an toàn của TTS (thường do phụ đề không có dấu chấm câu).
 * Câu hoàn chỉnh dù dài (~25s / ~60 từ / ~350 ký tự) vẫn giữ trọn vẹn 1 lần đọc.
 */
function splitOverlongGroup(g: DubTok[], isCjk: boolean): DubTok[][] {
  // CJK 85 ký tự khi dịch sang tiếng Việt thường tương đương ~400–520 ký tự (< trần 600 của Edge TTS)
  const HARD_MAX_CHARS = isCjk ? 85 : 350;
  const HARD_MAX_WORDS = 65;
  const HARD_MAX_DUR_MS = 28_000;
  const MIN_SIDE = isCjk ? 1 : 5;

  const text = joinTokens(g, isCjk);
  const dur = g[g.length - 1].end - g[0].start;
  const over = text.length > HARD_MAX_CHARS || (!isCjk && g.length > HARD_MAX_WORDS) || dur > HARD_MAX_DUR_MS;
  if (!over || g.length < MIN_SIDE * 2) return [g];

  const ks: number[] = [];
  for (let k = MIN_SIDE; k <= g.length - MIN_SIDE; k++) ks.push(k);
  const midTime = (g[0].start + g[g.length - 1].end) / 2;

  // Ưu tiên tách ở dấu phẩy / mệnh đề gần giữa nhất
  let best = ks
    .filter((k) => endsClause(g[k - 1].text) || /^[–—-]/.test(g[k].text))
    .sort((a, b) => Math.abs(g[a].start - midTime) - Math.abs(g[b].start - midTime))[0];

  // Không có dấu phẩy → tách ở khoảng ngừng hơi dài nhất trong vùng giữa (30%–70%)
  if (best === undefined) {
    const lo = Math.max(MIN_SIDE, Math.floor(g.length * 0.3));
    const hi = Math.min(g.length - MIN_SIDE, Math.ceil(g.length * 0.7));
    const midKs = ks.filter((k) => k >= lo && k <= hi);
    const pool = midKs.length ? midKs : ks;
    best = pool.sort((a, b) => {
      const gapDiff = g[b].start - g[b - 1].end - (g[a].start - g[a - 1].end);
      return gapDiff !== 0 ? gapDiff : Math.abs(g[a].start - midTime) - Math.abs(g[b].start - midTime);
    })[0];
  }

  if (best === undefined) return [g];
  return [...splitOverlongGroup(g.slice(0, best), isCjk), ...splitOverlongGroup(g.slice(best), isCjk)];
}

/** Ghép câu cực ngắn ("Ja.", "Genau!", "Wait.") với câu sát cạnh để TTS đọc tự nhiên, vẫn giữ nguyên câu trọn vẹn. */
function mergeTinySentences(groups: DubTok[][], isCjk: boolean): DubTok[][] {
  const isTiny = (g: DubTok[]) => {
    const dur = g[g.length - 1].end - g[0].start;
    return isCjk ? joinTokens(g, true).length <= 6 && dur < 1_400 : g.length <= 2 && dur < 1_400;
  };
  const fits = (a: DubTok[], b: DubTok[]) => {
    const gap = b[0].start - a[a.length - 1].end;
    if (gap > 500) return false;
    const dur = b[b.length - 1].end - a[0].start;
    const chars = joinTokens(a, isCjk).length + joinTokens(b, isCjk).length + (isCjk ? 0 : 1);
    return dur <= 16_000 && chars <= (isCjk ? 90 : 220) && (isCjk || a.length + b.length <= 30);
  };

  const out: DubTok[][] = [];
  for (const g of groups) {
    const prev = out[out.length - 1];
    if (prev && (isTiny(prev) || isTiny(g)) && fits(prev, g)) {
      out[out.length - 1] = [...prev, ...g];
    } else {
      out.push(g);
    }
  }
  return out;
}

/**
 * Sắp xếp lại phụ đề thành từng CÂU TRỌN VẸN ở mức từng từ:
 * - Tách đúng ngay sau dấu kết thúc câu (. ! ? … 。！？), kể cả khi dấu chấm nằm giữa 1 dòng phụ đề thô
 *   → không còn tình trạng 1–2 từ cuối câu bị đẩy sang câu sau, hay đầu câu sau dính vào câu trước.
 * - Giữ nguyên cả câu dài trong 1 lần đọc (chỉ tách khẩn cấp khi vượt trần TTS ~350 ký tự / 65 từ / 28 giây).
 */
export function mergeDubCues(raw: DubCueInput[]): DubCue[] {
  const cleaned: DubCueInput[] = raw
    .map((c) => ({
      start_ms: Math.max(0, Math.round(c.start_ms)),
      end_ms: Math.max(Math.round(c.end_ms), Math.round(c.start_ms) + 150),
      text: c.text.replace(/\s+/g, " ").trim(),
      ...(c.words?.length ? { words: c.words } : {}),
    }))
    .filter((c) => c.text && !/^[.\-–—♪♫\s]+$/.test(c.text))
    .sort((a, b) => a.start_ms - b.start_ms);

  if (cleaned.length === 0) return [];

  // Cắt phần thời gian chồng lên dòng sau trước khi tách từ
  const nonOverlap: DubCueInput[] = cleaned.map((c, i) => {
    const next = cleaned[i + 1];
    const end_ms = next ? Math.max(c.start_ms + 150, Math.min(c.end_ms, next.start_ms)) : c.end_ms;
    return { ...c, end_ms };
  });

  // Chỉ coi là CJK khi tỷ lệ chữ Hán/Nhật chiếm >= 25% số chữ cái (tránh video Đức/Anh có 1 từ Hán bị dính mất khoảng trắng)
  const sampleText = nonOverlap.slice(0, 12).map((c) => c.text).join("");
  const cjkChars = (sampleText.match(CJK_SCRIPT) ?? []).length;
  const letterChars = (sampleText.match(/\p{L}/gu) ?? []).length;
  const isCjk = letterChars > 0 && cjkChars / letterChars >= 0.25;
  const deduped = dedupRollingCues(nonOverlap, isCjk);
  const toks = tokenizeDubCues(deduped, isCjk);
  if (!toks.length) return [];

  const SILENCE_BREAK_MS = 2_000;
  const sentences: DubTok[][] = [];
  let cur: DubTok[] = [];

  for (const tok of toks) {
    if (cur.length && tok.start - cur[cur.length - 1].end > SILENCE_BREAK_MS) {
      sentences.push(cur);
      cur = [];
    }
    cur.push(tok);
    if (endsDubSentence(tok.text)) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);

  const balanced = mergeTinySentences(
    sentences.flatMap((g) => splitOverlongGroup(g, isCjk)),
    isCjk,
  );

  const merged: DubCue[] = balanced.map((g) => ({
    start_ms: g[0].start,
    end_ms: Math.max(g[0].start + 300, g[g.length - 1].end),
    text: joinTokens(g, isCjk),
  }));

  // Bảo đảm các câu không chồng thời gian lên nhau
  return merged.map((c, i) => {
    const next = merged[i + 1];
    const end = next ? Math.min(c.end_ms, next.start_ms) : c.end_ms;
    return { ...c, end_ms: Math.max(c.start_ms + 300, end) };
  });
}
