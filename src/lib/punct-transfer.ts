import { tokenize, type Segment, type Word } from "./subtitles";

/**
 * "Original + Whisper": giữ CHỮ + THỜI GIAN của phụ đề YouTube (nhận dạng chuẩn hơn Whisper),
 * thêm DẤU CÂU của Whisper (Whisper nghe được chỗ ngừng / ngữ điệu).
 *
 * Cách ghép: hai bản đều có thời gian từng từ → mỗi từ Whisper tìm từ YouTube giống nó trong khoảng ±2 giây
 * (đi tuần tự, không quay lui). Dấu câu của từ Whisper gắn vào từ YouTube tương ứng; từ Whisper không khớp
 * (nghe sai) thì gắn dấu câu vào từ YouTube gần nhất về thời gian.
 *
 * Hai chế độ:
 * - "fill" (mặc định): GIỮ dấu câu YouTube; chỉ câu YouTube quá dài (> 16 từ / > 8 giây) mới được chèn thêm
 *   dấu câu Whisper bên trong. Đo trên phụ đề người làm: dấu câu YouTube thường đã tốt (chấm câu đủ),
 *   Whisper chấm ít hơn (hay nối câu bằng dấu phẩy) → thay hết thì tệ hơn; chỉ bổ sung chỗ YouTube viết liền.
 * - "replace": bỏ hết dấu câu YouTube, dùng hoàn toàn dấu câu (+ chữ hoa) của Whisper.
 * Khớp được quá ít (Whisper nghe khác hẳn) → trả nguyên bản YouTube.
 */

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const TAIL = /[.,!?;:…]+(?=["»“”']?$)/u; // dấu câu cuối từ (trước dấu nháy đóng nếu có)
const strip = (w: string) => w.replace(TAIL, "");
const tail = (w: string) => w.match(TAIL)?.[0] ?? "";
const isEnd = (p: string) => /[.!?…]/.test(p);
const WINDOW = 2; // giây
const LOOKAHEAD = 15; // số từ YouTube xét tới mỗi lần tìm
export const MIN_MATCH = 0.5;
// Câu YouTube dài hơn thế này mới chèn dấu câu Whisper (giống ngưỡng cắt câu MAX_WORDS / MAX_SEC trong subtitles.ts)
const FILL_WORDS = 16;
const FILL_SEC = 8;
const EDGE = 2; // không chèn sát đầu / cuối câu (tránh câu cụt 1–2 từ)

export function transferPunctuation(
  yt: Segment[],
  wh: Segment[],
  { mode = "fill" }: { mode?: "fill" | "replace" } = {},
): { segments: Segment[]; matched: number } {
  // Từ YouTube theo từng dòng (giữ cấu trúc dòng + thời gian gốc)
  const perSeg = yt.map((s) => tokenize([s]));
  const A = perSeg.flat();
  const B = tokenize(wh);
  if (!A.length || !B.length) return { segments: yt, matched: 0 };

  // Ghép từ Whisper → từ YouTube
  const match: number[] = new Array(B.length).fill(-1);
  let i = 0;
  B.forEach((b, j) => {
    const n = norm(b.w);
    if (!n) return;
    // Bỏ qua từ YouTube đã quá xa phía trước (Whisper bỏ sót đoạn nhạc / đoạn đầu…) — nếu không sẽ kẹt mãi phía sau
    while (i < A.length && A[i].t < b.t - WINDOW) i++;
    for (let k = i; k < Math.min(i + LOOKAHEAD, A.length); k++) {
      if (A[k].t > b.t + WINDOW) break;
      if (A[k].t >= b.t - WINDOW && norm(A[k].w) === n) {
        match[j] = k;
        i = k + 1;
        return;
      }
    }
  });
  const matched = match.filter((k) => k >= 0).length / B.length;
  if (matched < MIN_MATCH) return { segments: yt, matched };

  const out = A.map((a) => strip(a.w));
  const wp: string[] = new Array(A.length).fill(""); // dấu câu Whisper đặt vào từng từ YouTube
  const cased = [...out]; // chữ hoa theo Whisper (danh từ, đầu câu), chữ cái vẫn của YouTube
  let last = 0; // dấu câu chỉ gắn tiến về phía trước
  B.forEach((b, j) => {
    let k = match[j];
    if (k >= 0) {
      const w = strip(b.w);
      if (norm(w) === norm(out[k]) && w.length === out[k].length) cased[k] = w;
    }
    const p = tail(b.w);
    if (!p) return;
    if (k < 0) {
      // Từ Whisper nghe sai → từ YouTube cuối cùng bắt đầu trước khi từ này kết thúc
      k = last;
      while (k + 1 < A.length && A[k + 1].t <= b.end) k++;
    }
    k = Math.max(k, last);
    // Dấu kết thúc câu mạnh hơn dấu phẩy
    if (!wp[k] || (isEnd(p) && !isEnd(wp[k]))) wp[k] = p;
    last = k;
  });

  let punct: string[];
  if (mode === "replace") {
    punct = wp;
    out.splice(0, out.length, ...cased);
  } else {
    punct = A.map((a) => tail(a.w));
    let s0 = 0;
    for (let k = 0; k < A.length; k++) {
      if (!isEnd(punct[k]) && k < A.length - 1) continue;
      // Câu YouTube [s0..k] quá dài → chèn dấu câu Whisper (chấm + phẩy) vào giữa
      if (k - s0 + 1 > FILL_WORDS || A[k].end - A[s0].t > FILL_SEC) {
        for (let x = s0 + EDGE - 1; x <= k - EDGE; x++) if (!punct[x] && wp[x]) punct[x] = wp[x];
      }
      s0 = k + 1;
    }
  }

  // Viết hoa chữ đầu câu
  for (let k = 0; k < out.length; k++) {
    if (k === 0 || isEnd(punct[k - 1])) out[k] = out[k].charAt(0).toUpperCase() + out[k].slice(1);
  }

  let k = 0;
  const segments = yt.map((s, si) => {
    const toks = perSeg[si];
    const ws = toks.map((): string => {
      const w = out[k] + punct[k];
      k++;
      return w;
    });
    return s.words
      ? { ...s, words: s.words.map(([t, , e], x): Word => (e === undefined ? [t, ws[x]] : [t, ws[x], e])), text: ws.join(" ") }
      : { ...s, text: ws.join(" ") };
  });
  return { segments, matched };
}
