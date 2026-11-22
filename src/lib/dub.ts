import "server-only";

export type DubCue = {
  start_ms: number;
  end_ms: number;
  text: string;
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

const CJK_SCRIPT = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u;
const DUB_ABBREV = new Set(
  "mr. mrs. ms. dr. prof. st. jr. sr. vs. etc. e.g. i.e. fig. no. vol. approx. z.b. d.h. u.a. usw. bzw. ca. nr. str. evtl. ggf. vgl. inkl. max. min. mio. mrd. hr. fr.".split(" "),
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

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Cắt phần từ lặp đầu câu do phụ đề cuộn (rolling captions) của YouTube sinh ra */
function appendDeduped(base: string, next: string, isCjk: boolean): string {
  const b = base.trim();
  const n = next.trim();
  if (!b) return n;
  if (!n) return b;
  if (isCjk) {
    const maxOverlap = Math.min(12, b.length, n.length);
    for (let k = maxOverlap; k >= 3; k--) {
      if (b.endsWith(n.slice(0, k))) return b + n.slice(k);
    }
    return b + n;
  }
  const bw = b.split(/\s+/);
  const nw = n.split(/\s+/);
  const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const maxK = Math.min(6, bw.length, nw.length);
  for (let k = maxK; k >= 1; k--) {
    let same = true;
    for (let i = 0; i < k; i++) {
      if (!norm(bw[bw.length - k + i]) || norm(bw[bw.length - k + i]) !== norm(nw[i])) {
        same = false;
        break;
      }
    }
    if (same) {
      const rest = nw.slice(k).join(" ");
      return rest ? `${b} ${rest}` : b;
    }
  }
  return `${b} ${n}`;
}

/**
 * Gộp các dòng phụ đề bị chặt vụn thành câu hoàn chỉnh (3–11 giây) để AI dịch đúng ngữ pháp,
 * đúng trật tự câu và giọng thuyết minh đọc liền mạch, tự nhiên hơn.
 */
export function mergeDubCues(raw: DubCue[]): DubCue[] {
  const sorted = raw
    .map((c) => ({
      start_ms: Math.max(0, Math.round(c.start_ms)),
      end_ms: Math.max(Math.round(c.end_ms), Math.round(c.start_ms) + 200),
      text: c.text.replace(/\s+/g, " ").trim(),
    }))
    .filter((c) => c.text && !/^[.\-–—♪♫\s]+$/.test(c.text))
    .sort((a, b) => a.start_ms - b.start_ms);

  if (sorted.length <= 1) return sorted;

  const isCjk = CJK_SCRIPT.test(sorted.slice(0, 12).map((c) => c.text).join(""));
  const MAX_DUR_MS = 10_500;
  const SOFT_DUR_MS = 7_500;
  const MAX_WORDS = 28;
  const SOFT_WORDS = 20;
  const MAX_CHARS = isCjk ? 85 : 190;
  const GAP_BREAK_MS = 1_200;

  const merged: DubCue[] = [];
  let cur: DubCue | null = null;

  for (const cue of sorted) {
    if (!cur) {
      cur = { ...cue };
      continue;
    }

    const gap = cue.start_ms - cur.end_ms;
    const curDur = cur.end_ms - cur.start_ms;
    const combinedDur = Math.max(cur.end_ms, cue.end_ms) - cur.start_ms;
    const combinedText = appendDeduped(cur.text, cue.text, isCjk);
    const curWords = wordCount(cur.text);
    const combinedWords = wordCount(combinedText);

    const sentenceDone = endsDubSentence(cur.text);
    const shortUtterance = curDur < 1_600 && (isCjk ? cur.text.length < 10 : curWords <= 4);

    const shouldBreak =
      gap > GAP_BREAK_MS ||
      (sentenceDone && (!shortUtterance || gap > 450 || combinedDur > SOFT_DUR_MS)) ||
      combinedDur > MAX_DUR_MS ||
      combinedText.length > MAX_CHARS ||
      (!isCjk && combinedWords > MAX_WORDS) ||
      (endsClause(cur.text) && (curDur >= SOFT_DUR_MS || (!isCjk && curWords >= SOFT_WORDS)));

    if (shouldBreak) {
      merged.push(cur);
      cur = { ...cue };
    } else {
      cur = {
        start_ms: cur.start_ms,
        end_ms: Math.max(cur.end_ms, cue.end_ms),
        text: combinedText,
      };
    }
  }
  if (cur) merged.push(cur);

  // Bảo đảm các câu không chồng thời gian lên nhau
  return merged.map((c, i) => {
    const next = merged[i + 1];
    const end = next ? Math.min(c.end_ms, next.start_ms) : c.end_ms;
    return { ...c, end_ms: Math.max(c.start_ms + 300, end) };
  });
}
