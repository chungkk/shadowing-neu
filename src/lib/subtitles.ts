export type Segment = {
  start: number; // giây
  end: number; // giây
  text: string;
  words?: Word[]; // phụ đề tự động YouTube (srv3) có thời gian từng từ → cắt câu chính xác
};

export type Word = [start: number, text: string];

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
  // format srv3: <p t="1200" d="3400">...</p> (mili giây).
  // Phụ đề tự động có thêm từng từ: <s t="160">kann</s> (t = mili giây tính từ đầu dòng)
  if (!segs.length) {
    for (const m of xml.matchAll(/<p t="(\d+)"(?: d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g)) {
      const start = Number(m[1]) / 1000;
      const end = start + Number(m[2] ?? 3000) / 1000;
      const words = [...m[3].matchAll(/<s(?: t="(\d+)")?[^>]*>([\s\S]*?)<\/s>/g)]
        .map(([, t, w]): Word => [start + Number(t ?? 0) / 1000, cleanText(w)])
        .filter(([, w]) => w);
      if (words.length) segs.push({ start: words[0][0], end, text: words.map(([, w]) => w).join(" "), words });
      else segs.push({ start, end, text: cleanText(m[3]) });
    }
  }
  return normalize(segs);
}

// Viết tắt tiếng Đức có dấu chấm nhưng không phải hết câu
const ABBREVIATIONS = new Set(
  "z.b. d.h. u.a. usw. bzw. ca. dr. nr. str. etc. evtl. ggf. vgl. bspw. inkl. max. min. mio. mrd. prof. hr. fr. z.t. o.ä. u.ä. sog. mr. mrs.".split(" "),
);

/** Từ này có kết thúc câu không? ("glauben." có, "z.B." / "3." (am 3. Oktober) thì không) */
function endsSentence(word: string): boolean {
  const w = word.replace(/["»«“”'’)]+$/, "").toLowerCase();
  if (/[!?…]$/.test(w)) return true;
  if (!w.endsWith(".")) return false;
  return !ABBREVIATIONS.has(w) && !/^\d{1,2}\.$/.test(w);
}

// Độ dài câu dễ nói theo nhất: khoảng 2–8 giây, 4–16 từ
const MAX_SEC = 8; // dài hơn → tách ở dấu phẩy
const MAX_WORDS = 16;
const MIN_SEC = 1.5; // ngắn hơn → ghép với câu bên cạnh
const MIN_WORDS = 3;
const LONG_SEC = 12; // dài thế này mà không có dấu phẩy → tách ở chỗ ngừng hơi dài nhất
const SILENCE = 2; // im lặng lâu hơn → luôn ngắt câu

type Tok = { t: number; end: number; w: string };

/** Trải mọi dòng phụ đề thành từng từ có thời gian (không có thời gian từng từ → chia theo số ký tự) */
function tokenize(segs: Segment[]): Tok[] {
  const toks: Tok[] = [];
  for (const s of segs) {
    let words = s.words;
    if (!words) {
      const ws = s.text.split(/\s+/).filter(Boolean);
      const total = ws.reduce((n, w) => n + w.length + 1, 0);
      let t = s.start;
      words = ws.map((w): Word => {
        const start = t;
        t += ((s.end - s.start) * (w.length + 1)) / total;
        return [start, w];
      });
    }
    words.forEach(([t, w], i) => toks.push({ t, end: i < words.length - 1 ? words[i + 1][0] : s.end, w }));
  }
  return toks;
}

const dur = (g: Tok[]) => g[g.length - 1].end - g[0].t;

/** Chỗ tách hợp lý trước từ thứ k: sau dấu phẩy / chấm phẩy / hai chấm, hoặc trước "–" (đổi người nói) */
const isBreak = (g: Tok[], k: number) => /[,;:]["»“”']?$/.test(g[k - 1].w) || /^[–-]/.test(g[k].w);

/** Tách câu quá dài ở dấu phẩy gần giữa nhất (đệ quy); không có dấu phẩy mà rất dài → chỗ ngừng hơi dài nhất */
function splitLong(g: Tok[]): Tok[][] {
  if (dur(g) <= MAX_SEC && g.length <= MAX_WORDS) return [g];
  // vị trí tách k: mỗi nửa còn ít nhất MIN_WORDS từ
  const ks: number[] = [];
  for (let k = MIN_WORDS; k <= g.length - MIN_WORDS; k++) ks.push(k);
  const mid = (g[0].t + g[g.length - 1].end) / 2;
  let best = ks.filter((k) => isBreak(g, k)).sort((a, b) => Math.abs(g[a].t - mid) - Math.abs(g[b].t - mid))[0];
  if (best === undefined && (dur(g) > LONG_SEC || g.length > MAX_WORDS * 1.5)) {
    best = ks.sort((a, b) => g[b].t - g[b - 1].end - (g[a].t - g[a - 1].end))[0];
  }
  if (best === undefined) return [g];
  return [...splitLong(g.slice(0, best)), ...splitLong(g.slice(best))];
}

/** Ghép câu quá ngắn ("Und Ihnen?") với câu kế bên nếu sát nhau và ghép xong không quá dài */
function mergeShort(groups: Tok[][]): Tok[][] {
  const isShort = (g: Tok[]) => dur(g) < MIN_SEC || g.length <= MIN_WORDS;
  const fits = (a: Tok[], b: Tok[]) =>
    b[0].t - a[a.length - 1].end <= 1 && b[b.length - 1].end - a[0].t <= MAX_SEC && a.length + b.length <= MAX_WORDS;
  const out: Tok[][] = [];
  for (const g of groups) {
    const prev = out[out.length - 1];
    if (prev && (isShort(prev) || isShort(g)) && fits(prev, g)) out[out.length - 1] = [...prev, ...g];
    else out.push(g);
  }
  return out;
}

/**
 * Gộp các dòng phụ đề thành câu để luyện: ngắt ở dấu kết thúc câu (. ! ? …) hoặc khoảng im lặng dài,
 * rồi tách câu quá dài ở dấu phẩy và ghép câu quá ngắn với câu bên cạnh.
 */
export function mergeIntoSentences(segs: Segment[]): Segment[] {
  const toks = tokenize(segs);
  const groups: Tok[][] = [];
  let cur: Tok[] = [];
  for (const tok of toks) {
    if (cur.length && tok.t - cur[cur.length - 1].end > SILENCE) {
      groups.push(cur);
      cur = [];
    }
    cur.push(tok);
    if (endsSentence(tok.w)) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);

  return mergeShort(groups.flatMap(splitLong)).map((g) => ({
    start: g[0].t,
    end: g[g.length - 1].end,
    text: g.map((x) => x.w).join(" "),
  }));
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
