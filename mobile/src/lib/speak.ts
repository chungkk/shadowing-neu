import { setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";

/**
 * Đọc tiếng Đức bằng giọng có sẵn của máy (expo-speech, offline, miễn phí).
 * Luôn tự chọn giọng tốt nhất: de-DE trước, chất lượng cao (Enhanced — tải trong Cài đặt → Trợ năng → Nội dung được đọc) trước.
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

/** Tốc độ đọc thường (1×); `speed` nhân với mức này (0,75× … 1,1×) */
const NORMAL_RATE = 0.95;

/** Mỗi lần đọc / dừng tăng 1 → lần đọc đang chờ (await) mà đã bị dừng hoặc bị lần sau thay thì không phát nữa */
let gen = 0;

export async function speakGerman(text: string, opts: { slow?: boolean; speed?: number; voice?: string; onEnd?: () => void } = {}) {
  const my = ++gen;
  await Speech.stop();
  if (my !== gen) return opts.onEnd?.(); // như onStopped của câu bị dừng
  // Vẫn có tiếng khi gạt công tắc im lặng
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  const voice = opts.voice ?? (await germanVoices())[0]?.identifier;
  // Bị dừng giữa lúc chuẩn bị (vd. bấm thu âm) → không phát chồng lên lượt thu
  if (my !== gen) return opts.onEnd?.();
  Speech.speak(text, {
    language: "de-DE",
    voice,
    rate: opts.slow ? 0.6 : NORMAL_RATE * (opts.speed ?? 1),
    onDone: opts.onEnd,
    onStopped: opts.onEnd,
    onError: opts.onEnd,
  });
}

export const stopSpeaking = () => {
  gen++;
  return Speech.stop();
};
