import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import * as Speech from "expo-speech";
import { API_URL, authHeaders } from "./api";

/**
 * Đọc tiếng Đức. Ưu tiên giọng neural như người Đức thật (server /tts tạo mp3, máy lưu cache → lần sau phát ngay, offline vẫn nghe).
 * Chưa đăng nhập / mất mạng / server chưa bật → lùi về giọng có sẵn của máy (expo-speech):
 * tự chọn giọng tốt nhất: de-DE trước, chất lượng cao (Enhanced — tải trong Cài đặt → Trợ năng → Nội dung được đọc) trước.
 * (Trước đây cho chọn giọng ở tab Tài khoản — lựa chọn cũ còn lưu trên máy được bỏ qua.)
 */

let voices: Speech.Voice[] | null = null;

/** Các giọng tiếng Đức trong máy, tốt nhất trước. `fresh` → đọc lại (vừa tải thêm giọng) */
export async function germanVoices(fresh = false): Promise<Speech.Voice[]> {
  if (voices?.length && !fresh) return voices;
  try {
    const rank = (v: Speech.Voice) => (v.language === "de-DE" ? 0 : 2) + (v.quality === Speech.VoiceQuality.Enhanced ? 0 : 1);
    voices = (await Speech.getAvailableVoicesAsync())
      .filter((v) => v.language.toLowerCase().startsWith("de"))
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  } catch {
    voices = [];
  }
  return voices;
}

/** Tốc độ đọc thường (1×) của giọng máy; `speed` nhân với mức này (0,75× … 1,1×) */
const NORMAL_RATE = 0.95;
/** Đọc chậm: giọng máy / giọng neural (neural vốn đọc tự nhiên nên chỉ hãm vừa phải) */
const SLOW_RATE = 0.6;
const SLOW_NEURAL = 0.7;
/** Tải giọng neural quá lâu (mạng yếu) → đọc bằng giọng máy cho khỏi chờ */
const FETCH_TIMEOUT_MS = 6000;

// ---- Giọng neural: file mp3 cache trên máy ----

/** Server báo chưa bật giọng neural (503) → khỏi hỏi lại trong lần mở app này */
let neuralOff = false;
const pending = new Map<string, Promise<File | null>>();

// Băm câu thành tên file (cyrb53 — đủ tránh trùng cho vài nghìn câu)
function hash(s: string) {
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** File mp3 giọng neural của `text` (tải về nếu chưa có); null = không lấy được → dùng giọng máy */
function neuralFile(text: string): Promise<File | null> {
  text = clean(text);
  const headers = authHeaders();
  if (neuralOff || !headers || !text) return Promise.resolve(null);
  const dir = new Directory(Paths.cache, "tts");
  const file = new File(dir, `${hash(text)}.mp3`);
  if (file.exists && file.size > 0) return Promise.resolve(file);
  let job = pending.get(file.uri);
  if (!job) {
    job = (async () => {
      const abort = new AbortController(); // AbortSignal.timeout chưa chắc có trên Hermes
      const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
      try {
        dir.create({ idempotent: true, intermediates: true });
        await File.downloadFileAsync(`${API_URL}/api/v1/tts?text=${encodeURIComponent(text)}`, file, {
          headers,
          idempotent: true,
          signal: abort.signal,
        });
        return file.exists && file.size > 0 ? file : null;
      } catch (e) {
        if (String(e).includes("503")) neuralOff = true;
        if (file.exists) file.delete();
        return null;
      } finally {
        clearTimeout(timer);
        pending.delete(file.uri);
      }
    })();
    pending.set(file.uri, job);
  }
  return job;
}

/** Tải sẵn giọng neural (vd. câu sắp ôn) để lúc bấm nghe là phát ngay */
export const prefetchGerman = (text: string) => void neuralFile(text);

let player: AudioPlayer | null = null;
/** onEnd của lần phát neural đang chạy — gọi đúng 1 lần (hết câu hoặc bị dừng, như onStopped của giọng máy) */
let playing: (() => void) | undefined;
const finish = () => {
  const cb = playing;
  playing = undefined;
  cb?.();
};

function neuralPlayer() {
  if (!player) {
    player = createAudioPlayer(null);
    player.addListener("playbackStatusUpdate", (s) => s.didJustFinish && finish());
  }
  return player;
}

/** Dừng mọi tiếng đang đọc (neural + giọng máy) */
async function halt() {
  player?.pause();
  finish();
  await Speech.stop();
}

/** Mỗi lần đọc / dừng tăng 1 → lần đọc đang chờ (await) mà đã bị dừng hoặc bị lần sau thay thì không phát nữa */
let gen = 0;

export async function speakGerman(text: string, opts: { slow?: boolean; speed?: number; voice?: string; onEnd?: () => void } = {}) {
  const my = ++gen;
  await halt();
  if (my !== gen) return opts.onEnd?.(); // như onStopped của câu bị dừng
  // Vẫn có tiếng khi gạt công tắc im lặng
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  // Chọn giọng máy cụ thể (opts.voice) → không dùng neural
  const file = opts.voice ? null : await neuralFile(text);
  // Bị dừng giữa lúc chuẩn bị (vd. bấm thu âm) → không phát chồng lên lượt thu
  if (my !== gen) return opts.onEnd?.();
  if (file) {
    const p = neuralPlayer();
    p.replace({ uri: file.uri });
    p.setPlaybackRate(opts.slow ? SLOW_NEURAL : (opts.speed ?? 1), "high");
    playing = opts.onEnd;
    p.play();
    return;
  }
  const voice = opts.voice ?? (await germanVoices())[0]?.identifier;
  if (my !== gen) return opts.onEnd?.();
  Speech.speak(text, {
    language: "de-DE",
    voice,
    rate: opts.slow ? SLOW_RATE : NORMAL_RATE * (opts.speed ?? 1),
    onDone: opts.onEnd,
    onStopped: opts.onEnd,
    onError: opts.onEnd,
  });
}

export const stopSpeaking = () => {
  gen++;
  return halt();
};
