/**
 * Đo chất lượng phụ đề Whisper (v1 / v2) trên video có sẵn phụ đề tiếng Đức:
 * - Chữ: tỉ lệ sai từ (WER) so với phụ đề DO NGƯỜI LÀM
 * - Thời gian: lệch đầu từ / đầu câu so với phụ đề TỰ ĐỘNG của YouTube (có thời gian từng từ, khá chuẩn)
 * - Câu: số câu, độ dài câu (giây), % câu quá dài — đúng như app cắt câu (mergeIntoSentences)
 *
 * Chạy (cần yt-dlp + ffmpeg, key Whisper trong .env.local):
 *   node --conditions=react-server --env-file=.env.local scripts/eval-whisper.mts \
 *     [--clip 240] [--versions v1,v2] [--label truoc] [--prompt] [--mix] [--punctuate off|auto|always] <videoId> [videoId…]
 * Audio + phụ đề tải về lưu ở $TMPDIR/whisper-eval (chạy lại không tải lại). Kết quả: <label>.json cùng thư mục.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { mergeIntoSentences, parseYouTubeXml, tokenize, type Segment, type Tok } from "../src/lib/subtitles.ts";
import { register } from "node:module";
import { addPunctuation, lacksPunctuation } from "../src/lib/punctuate.ts";
import { transcribeAudio, type WhisperVersion } from "../src/lib/whisper.ts";

const argv = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv.splice(i, 2)[1] : def;
};
const CLIP = Number(opt("clip", "240"));
const VERSIONS = opt("versions", "v1,v2").split(",") as WhisperVersion[];
const LABEL = opt("label", "ketqua");
// Thêm dấu câu bằng LLM cho kết quả v2: off | auto (như app: chỉ khi thiếu dấu câu) | always (để xem tác dụng)
const PUNCTUATE = opt("punctuate", "off");
// --mix: thêm 2 dòng so sánh cho mỗi video: "yt" = phụ đề tự động YouTube (Original) nguyên bản,
// "mix" = Original + dấu câu Whisper v2 chèn vào câu quá dài, "mix-thay" = thay hết bằng dấu câu Whisper (src/lib/punct-transfer.ts)
const MIX = argv.includes("--mix") && !!argv.splice(argv.indexOf("--mix"), 1);
// Code trong src/lib import không có đuôi (./subtitles) → cho Node tự thêm ".ts"
register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (s.startsWith('.') && !/\\.\\w+$/.test(s)) return n(s + '.ts', c); throw e; } }",
    ),
);
const { transferPunctuation } = await import("../src/lib/punct-transfer.ts");
// --prompt: gửi tiêu đề video làm prompt cho Whisper (app không làm vậy — thử thì thấy kém hơn)
const PROMPT = argv.includes("--prompt") && !!argv.splice(argv.indexOf("--prompt"), 1);
const ids = argv;
if (!ids.length) throw new Error("Thiếu videoId");

// Giữ giống AUDIO_FORMAT trong src/lib/ytdlp.ts (chỉ lấy giọng gốc, bỏ bản YouTube lồng tiếng AI)
const AUDIO_FORMAT =
  "ba[format_id^=139][format_note*=original]/ba[format_id^=249][format_note*=original][format_id!*=drc]/" +
  "wa[format_note*=original][protocol^=http][format_id!*=drc]/139/249/wa[vcodec=none]/wa";
const DIR = path.join(tmpdir(), "whisper-eval");
mkdirSync(path.join(DIR, "api-cache"), { recursive: true });

// Lưu kết quả thô của API (Whisper + LLM thêm dấu câu) theo nội dung request → đo lại sau khi sửa phần xử lý
// trong app mà không gọi API lại (Groq giới hạn 7200 giây audio / giờ). Bị 429 → chờ rồi thử lại.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const h = createHash("sha1").update(String(input));
  const body = init?.body;
  if (body instanceof FormData) {
    for (const [k, v] of body) h.update(k).update(typeof v === "string" ? v : Buffer.from(await v.arrayBuffer()));
  } else if (typeof body === "string") h.update(body);
  const file = path.join(DIR, "api-cache", `${h.digest("hex")}.json`);
  if (existsSync(file)) return new Response(readFileSync(file), { headers: { "content-type": "application/json" } });
  for (;;) {
    const res = await realFetch(input, init);
    if (res.status === 429) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 60, 600);
      console.error(`[eval] 429, chờ ${wait}s…`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    const text = await res.text();
    if (res.ok) writeFileSync(file, text);
    return new Response(text, { status: res.status, headers: res.headers });
  }
};
const ytdlp = (args: string[]) =>
  execFileSync("yt-dlp", ["--no-warnings", "--js-runtimes", "node", ...args], { stdio: ["ignore", "pipe", "inherit"] }).toString();

function fetchVideo(id: string) {
  const d = path.join(DIR, id);
  mkdirSync(d, { recursive: true });
  const url = `https://www.youtube.com/watch?v=${id}`;
  const find = (re: RegExp) => readdirSync(d).find((f) => re.test(f));
  if (!existsSync(path.join(d, "title.txt"))) writeFileSync(path.join(d, "title.txt"), ytdlp(["--print", "%(title)s", "--skip-download", url]).trim());
  if (!find(/^man\..*srv3$/)) ytdlp(["--skip-download", "--write-subs", "--sub-langs", "de.*", "--sub-format", "srv3", "-o", path.join(d, "man"), url]);
  if (!find(/^auto\..*srv3$/)) ytdlp(["--skip-download", "--write-auto-subs", "--sub-langs", "de-orig", "--sub-format", "srv3", "-o", path.join(d, "auto"), url]);
  if (!find(/^audio\./)) ytdlp(["-f", AUDIO_FORMAT, "--download-sections", `*0-${CLIP}`, "-o", path.join(d, "audio.%(ext)s"), url]);
  const man = find(/^man\..*srv3$/);
  const auto = find(/^auto\..*srv3$/);
  const audio = find(/^audio\./);
  if (!man || !auto || !audio) throw new Error(`${id}: thiếu phụ đề người làm / tự động / audio`);
  return {
    title: readFileSync(path.join(d, "title.txt"), "utf8"),
    man: parseYouTubeXml(readFileSync(path.join(d, man), "utf8")),
    auto: parseYouTubeXml(readFileSync(path.join(d, auto), "utf8")),
    audio: path.join(d, audio),
  };
}

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const words = (toks: Tok[]) => toks.map((t) => ({ ...t, n: norm(t.w) })).filter((t) => t.n);

/** Căn 2 dãy từ (Levenshtein) → số lỗi + cặp chỉ số khớp đúng chữ */
function alignWords(ref: string[], hyp: string[]) {
  const n = ref.length;
  const m = hyp.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => Uint32Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
  const pairs: [number, number][] = [];
  for (let i = n, j = m; i > 0 && j > 0; ) {
    if (ref[i - 1] === hyp[j - 1] && dp[i][j] === dp[i - 1][j - 1]) pairs.push([--i, --j]);
    else if (dp[i][j] === dp[i - 1][j - 1] + 1) {
      i--;
      j--;
    } else if (dp[i][j] === dp[i - 1][j] + 1) i--;
    else j--;
  }
  return { errors: dp[n][m], pairs: pairs.reverse() };
}

const q = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const pct = (xs: boolean[]) => (xs.length ? (100 * xs.filter(Boolean).length) / xs.length : NaN);

function evaluate(hypSegs: Segment[], man: Segment[], auto: Segment[]) {
  const W = CLIP - 3; // bỏ vài giây cuối (audio cắt giữa chừng)
  const hyp = words(tokenize(hypSegs)).filter((t) => t.t < W);
  const refText = words(tokenize(man)).filter((t) => t.t < W);
  const refTime = words(tokenize(auto)).filter((t) => t.t < W + 5);

  const wer = alignWords(refText.map((t) => t.n), hyp.map((t) => t.n)).errors / refText.length;

  const { pairs } = alignWords(refTime.map((t) => t.n), hyp.map((t) => t.n));
  const refOf = new Map(pairs.map(([r, h]) => [h, refTime[r].t]));
  const refIdx = new Map(pairs.map(([r, h]) => [h, r]));
  const wordErr = pairs.map(([r, h]) => Math.abs(hyp[h].t - refTime[r].t));

  const sentences = mergeIntoSentences(hypSegs).filter((s) => s.start < W);
  const startErr: number[] = [];
  for (const s of sentences) {
    const h = hyp.findIndex((t) => Math.abs(t.t - s.start) < 1e-6);
    if (h >= 0 && refOf.has(h)) startErr.push(Math.abs(s.start - refOf.get(h)!));
  }
  const dur = sentences.map((s) => s.end - s.start);
  // Cuối câu: so với lúc bắt đầu từ KẾ TIẾP (theo phụ đề tự động). gap = khoảng còn lại tới lời kế tiếp
  // (lớn → câu đã dừng trước khoảng lặng); bleed = câu phát lấn sang lời của câu sau
  const gaps: number[] = [];
  const bleed: boolean[] = [];
  for (const s of sentences) {
    let h = -1;
    for (let i = 0; i < hyp.length; i++) if (hyp[i].t >= s.start - 1e-6 && hyp[i].t < s.end) h = i;
    const r = refIdx.get(h);
    if (r === undefined || r + 1 >= refTime.length) continue;
    const next = refTime[r + 1].t;
    gaps.push(next - s.end);
    bleed.push(s.end > next + 0.1);
  }
  // Chỗ ngắt câu (dấu . ! ? …) so với phụ đề người làm: căn từ rồi so vị trí dấu kết thúc câu
  const isEndTok = (w: string) => /[.!?…]["»“”']?$/.test(w);
  const bp = alignWords(refText.map((t) => t.n), hyp.map((t) => t.n)).pairs;
  let tp = 0;
  let hypB = 0;
  let refB = 0;
  for (const [ri, hi] of bp) {
    const a = isEndTok(refText[ri].w);
    const b = isEndTok(hyp[hi].w);
    if (a) refB++;
    if (b) hypB++;
    if (a && b) tp++;
  }
  const endPunct = (toks: { w: string }[]) => (100 * toks.filter((t) => /[.!?…]["»“”']?$/.test(t.w)).length) / toks.length;
  return {
    wer,
    wordMed: q(wordErr, 0.5),
    word90: q(wordErr, 0.9),
    wordOk: pct(wordErr.map((e) => e <= 0.3)),
    startMed: q(startErr, 0.5),
    start90: q(startErr, 0.9),
    startOk: pct(startErr.map((e) => e <= 0.3)),
    sentences: sentences.length,
    durMed: q(dur, 0.5),
    long: pct(dur.map((d) => d > 8)),
    gapMed: q(gaps, 0.5),
    bleed: pct(bleed),
    punct: endPunct(hyp),
    bPrec: hypB ? (100 * tp) / hypB : NaN,
    bRec: refB ? (100 * tp) / refB : NaN,
    bF1: hypB + refB ? (200 * tp) / (hypB + refB) : NaN,
    punctRef: endPunct(refText),
    hasWords: hypSegs.some((s) => s.words),
  };
}

type Row = ReturnType<typeof evaluate> & { id: string; version: string; used: string };
const rows: Row[] = [];
const segsOut: Record<string, Segment[]> = {};
for (const id of ids) {
  let v;
  try {
    v = fetchVideo(id);
  } catch (e) {
    console.error((e as Error).message);
    continue;
  }
  const buf = readFileSync(v.audio);
  for (const version of VERSIONS) {
    const name = path.basename(v.audio);
    const r = await transcribeAudio(new Blob([buf], { type: name.endsWith(".webm") ? "audio/webm" : "audio/mp4" }), name, 0, {
      version,
      prompt: PROMPT ? v.title : undefined,
    });
    let segs = r.segments;
    if (r.version === "v2" && (PUNCTUATE === "always" || (PUNCTUATE === "auto" && lacksPunctuation(segs)))) {
      segs = await addPunctuation(segs);
    }
    const row = { id, version, used: r.version, ...evaluate(segs, v.man, v.auto) };
    rows.push(row);
    segsOut[`${id}:${version}`] = segs;
    console.log(id, version, JSON.stringify(row, (_, x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x)));
    if (MIX && r.version === "v2") {
      const mix = transferPunctuation(v.auto, segs);
      const mixr = transferPunctuation(v.auto, segs, { mode: "replace" });
      // Mô phỏng video YouTube chấm câu kém: xoá hết dấu câu của bản Original rồi khôi phục bằng Whisper / LLM
      const bare = v.auto.map((sg) => {
        const st = (w: string) => w.replace(/[.,!?;:…]+(?=["»“”']?$)/u, "");
        return sg.words ? { ...sg, words: sg.words.map(([t, w]) => [t, st(w)] as [number, string]), text: sg.text } : { ...sg, text: sg.text.split(" ").map(st).join(" ") };
      }).map((sg) => (sg.words ? { ...sg, text: sg.words.map(([, w]) => w).join(" ") } : sg));
      const mixBare = transferPunctuation(bare, segs);
      const llmBare = await addPunctuation(bare);
      for (const [name, sg] of [
        ["yt", v.auto],
        ["mix", mix.segments],
        ["mix-thay", mixr.segments],
        ["trần", bare],
        ["trần+whisper", mixBare.segments],
        ["trần+LLM", llmBare],
      ] as const) {
        const row2 = { id, version: name, used: name === "yt" ? "yt" : `khớp ${Math.round(mix.matched * 100)}%`, ...evaluate(sg, v.man, v.auto) };
        rows.push(row2);
        segsOut[`${id}:${name}`] = sg;
        console.log(id, name, JSON.stringify(row2, (_, x) => (typeof x === "number" ? Math.round(x * 100) / 100 : x)));
      }
    }
  }
}

const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "–");
const avg = (xs: number[]) => xs.filter(Number.isFinite).reduce((a, b) => a + b, 0) / xs.filter(Number.isFinite).length;
console.log(`\n=== Trung bình (${new Set(rows.map((r) => r.id)).size} video, ${CLIP}s đầu mỗi video) ===`);
console.log("bản | WER% | lệch từ (trung vị/p90) | từ ≤0.3s | lệch đầu câu (trung vị/p90) | đầu câu ≤0.3s | số câu | dài câu (s) | câu >8s | cuối câu→lời kế (s) | lấn câu sau | dấu chấm/100 từ (đáp án) | ngắt câu P/R/F1");
for (const ver of [...VERSIONS, ...(MIX ? ["yt", "mix", "mix-thay", "trần", "trần+whisper", "trần+LLM"] : [])]) {
  const rs = rows.filter((r) => r.version === ver);
  const a = (k: keyof Row) => avg(rs.map((r) => r[k] as number));
  console.log(
    [ver, f(a("wer") * 100, 1), `${f(a("wordMed"))}/${f(a("word90"))}`, f(a("wordOk"), 0) + "%", `${f(a("startMed"))}/${f(a("start90"))}`,
      f(a("startOk"), 0) + "%", f(a("sentences"), 1), f(a("durMed"), 1), f(a("long"), 0) + "%", f(a("gapMed")), f(a("bleed"), 0) + "%",
      `${f(a("punct"), 1)} (${f(a("punctRef"), 1)})`, `${f(a("bPrec"), 0)}/${f(a("bRec"), 0)}/${f(a("bF1"), 0)}`].join(" | "),
  );
}
writeFileSync(path.join(DIR, `${LABEL}.json`), JSON.stringify(rows, null, 1));
writeFileSync(path.join(DIR, `${LABEL}-segments.json`), JSON.stringify(segsOut));
console.log(`\nĐã lưu ${path.join(DIR, `${LABEL}.json`)}`);
