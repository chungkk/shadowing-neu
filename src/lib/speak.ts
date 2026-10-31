/**
 * Đọc tiếng Đức trên web (giống mobile/src/lib/speak.ts): ưu tiên giọng neural của server (/api/v1/tts, cần đăng nhập),
 * mp3 giữ trong bộ nhớ trang → nghe lại phát ngay. Chưa đăng nhập / server chưa bật / lỗi mạng → giọng có sẵn của trình duyệt.
 */

/** Đọc chậm: giọng neural vốn tự nhiên nên chỉ hãm vừa phải */
const SLOW_NEURAL = 0.7;
const SLOW_BROWSER = 0.6;
/** Tải giọng neural quá lâu (mạng yếu) → đọc bằng giọng trình duyệt cho khỏi chờ */
const FETCH_TIMEOUT_MS = 6000;

let neuralOff = false; // server báo 401 / 503 → khỏi hỏi lại trong lần mở trang này
const files = new Map<string, Promise<string | null>>(); // câu → object URL của mp3 (null = không lấy được)
let audio: HTMLAudioElement | null = null;
let endCb: (() => void) | undefined;
let seq = 0; // lệnh đọc mới nhất (lệnh cũ tải xong muộn thì bỏ)

const clean = (text: string) => text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

function finish() {
  const cb = endCb;
  endCb = undefined;
  cb?.();
}

export function stopSpeaking() {
  seq++;
  audio?.pause();
  audio = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  finish();
}

function neuralFile(text: string): Promise<string | null> {
  if (neuralOff) return Promise.resolve(null);
  let job = files.get(text);
  if (!job) {
    job = fetch(`/api/v1/tts?text=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      .then(async (r) => {
        if (r.status === 401 || r.status === 503) neuralOff = true;
        if (!r.ok) throw new Error(String(r.status));
        return URL.createObjectURL(await r.blob());
      })
      .catch(() => {
        files.delete(text); // lỗi tạm thời → lần sau thử lại
        return null;
      });
    files.set(text, job);
  }
  return job;
}

/** Tải sẵn giọng đọc (vd. các từ trong câu đang học) để chạm vào là phát ngay */
export const prefetchGerman = (text: string) => void (clean(text) && neuralFile(clean(text)));

function browserVoice(text: string, slow: boolean) {
  if (typeof speechSynthesis === "undefined") return finish();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = slow ? SLOW_BROWSER : 0.95;
  // Giọng de-DE tốt nhất (ưu tiên giọng online / "Natural" của trình duyệt)
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de"));
  u.voice = voices.find((v) => /natural|online|google/i.test(v.name)) ?? voices.find((v) => v.lang === "de-DE") ?? voices[0] ?? null;
  u.onend = u.onerror = finish;
  speechSynthesis.speak(u);
}

/** Đọc `text`; `onEnd` gọi khi đọc xong / bị dừng / lỗi */
export async function speakGerman(text: string, opts: { slow?: boolean; onEnd?: () => void } = {}) {
  stopSpeaking();
  const my = seq;
  text = clean(text);
  endCb = opts.onEnd;
  if (!text) return finish();
  const url = await neuralFile(text);
  if (my !== seq) return; // đã có lệnh đọc khác
  if (!url) return browserVoice(text, !!opts.slow);
  const el = new Audio(url);
  audio = el;
  el.playbackRate = opts.slow ? SLOW_NEURAL : 1;
  el.onended = el.onerror = () => audio === el && finish();
  el.play().catch(() => audio === el && browserVoice(text, !!opts.slow));
}
