export type Segment = {
  start: number; // giây
  end: number; // giây
  text: string;
};

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));

const cleanText = (s: string) =>
  decodeEntities(s.replace(/<[^>]+>/g, ""))
    .replace(/\[[^\]]*\]/g, "") // [Musik], [Applaus]
    .replace(/\s+/g, " ")
    .trim();

/** "00:01:02,500" | "01:02.5" -> giây */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().replace(",", ".").split(":");
  return parts.reduce((acc, p) => acc * 60 + parseFloat(p), 0);
}

/** Chuẩn hoá: sắp xếp, bỏ dòng rỗng, cắt phần chồng lên dòng sau (sub tự động của YouTube hay bị chồng). */
export function normalize(segs: Segment[]): Segment[] {
  const sorted = segs.filter((s) => s.text).sort((a, b) => a.start - b.start);
  return sorted.map((s, i) => {
    const next = sorted[i + 1];
    const end = next ? Math.min(s.end, next.start) : s.end;
    return { ...s, end: Math.max(end, s.start + 0.3) };
  });
}

/** Đọc file .srt hoặc .vtt */
export function parseSubtitleFile(content: string): Segment[] {
  const blocks = content.replace(/\r/g, "").split(/\n{2,}/);
  const segs: Segment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const idx = lines.findIndex((l) => l.includes("-->"));
    if (idx === -1) continue;
    const [a, b] = lines[idx].split("-->");
    const text = cleanText(lines.slice(idx + 1).join(" "));
    if (!text) continue;
    segs.push({
      start: parseTimestamp(a),
      end: parseTimestamp(b.trim().split(/\s+/)[0]),
      text,
    });
  }
  return normalize(segs);
}

/** Đọc XML timedtext của YouTube (<text start dur>) */
export function parseYouTubeXml(xml: string): Segment[] {
  const segs: Segment[] = [];
  // format cũ: <text start="1.2" dur="3.4">...</text>
  for (const m of xml.matchAll(/<text start="([\d.]+)"(?: dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g)) {
    const start = parseFloat(m[1]);
    segs.push({ start, end: start + parseFloat(m[2] ?? "3"), text: cleanText(m[3]) });
  }
  // format srv3: <p t="1200" d="3400">...</p> (mili giây)
  if (!segs.length) {
    for (const m of xml.matchAll(/<p t="(\d+)"(?: d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g)) {
      const start = Number(m[1]) / 1000;
      segs.push({ start, end: start + Number(m[2] ?? 3000) / 1000, text: cleanText(m[3]) });
    }
  }
  return normalize(segs);
}

/**
 * Gộp các dòng ngắn thành câu: kết thúc khi gặp dấu câu (. ! ? …)
 * hoặc khi đoạn đã dài quá maxDuration giây (cho sub tự động không có dấu câu).
 */
export function mergeIntoSentences(segs: Segment[], maxDuration = 8): Segment[] {
  const out: Segment[] = [];
  let cur: Segment | null = null;
  for (const s of segs.flatMap(splitSentences)) {
    // Không gộp qua khoảng im lặng dài
    if (cur && s.start - cur.end > 1) {
      out.push(cur);
      cur = null;
    }
    if (!cur) cur = { ...s };
    else {
      cur.text += " " + s.text;
      cur.end = s.end;
    }
    const endsSentence = /[.!?…]["»“”']?$/.test(cur.text);
    if (endsSentence || cur.end - cur.start >= maxDuration) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Tách 1 đoạn chứa nhiều câu (Whisper hay gộp ~10 giây) thành từng câu,
 * chia thời gian theo tỉ lệ số ký tự.
 */
function splitSentences(seg: Segment): Segment[] {
  const parts = seg.text.match(/[^.!?…]+[.!?…]+["»“”']?|[^.!?…]+$/g)?.map((p) => p.trim()).filter(Boolean);
  if (!parts || parts.length < 2) return [seg];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const dur = seg.end - seg.start;
  let t = seg.start;
  return parts.map((text) => {
    const start = t;
    t += (dur * text.length) / total;
    return { start, end: t, text };
  });
}

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function srtTime(t: number): string {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

/** Xuất ra định dạng SRT (để admin chỉnh sửa / người dùng tải về) */
export function toSrt(segs: Segment[]): string {
  return segs.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join("\n");
}
