import { setAudioModeAsync } from "expo-audio";
import * as SecureStore from "expo-secure-store";
import * as Speech from "expo-speech";

/**
 * Đọc tiếng Đức bằng giọng có sẵn của máy (expo-speech, offline, miễn phí).
 * Người dùng chọn giọng ở tab Tài khoản (lưu trên máy). Chưa chọn, hoặc giọng đã chọn không còn trong máy →
 * tự chọn: ưu tiên giọng chất lượng cao (Enhanced) nếu đã tải trong Cài đặt → Trợ năng → Nội dung được đọc.
 */

const STORE_KEY = "tts-voice";

let voices: Speech.Voice[] | null = null;
/** Giọng người dùng đã chọn; null = tự động, undefined = chưa đọc từ máy */
let chosen: string | null | undefined;

/** Các giọng tiếng Đức trong máy: de-DE trước, chất lượng cao trước, rồi theo tên. `fresh` → đọc lại (vừa tải thêm giọng) */
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

export async function chosenVoice(): Promise<string | null> {
  if (chosen === undefined) chosen = await SecureStore.getItemAsync(STORE_KEY).catch(() => null);
  return chosen;
}

/** null → quay về tự động */
export function setChosenVoice(id: string | null) {
  chosen = id;
  (id ? SecureStore.setItemAsync(STORE_KEY, id) : SecureStore.deleteItemAsync(STORE_KEY)).catch(() => {});
}

async function germanVoice(): Promise<string | undefined> {
  const de = await germanVoices();
  const id = await chosenVoice();
  return (de.find((v) => v.identifier === id) ?? de[0])?.identifier;
}

export async function speakGerman(text: string, opts: { slow?: boolean; voice?: string; onEnd?: () => void } = {}) {
  await Speech.stop();
  // Vẫn có tiếng khi gạt công tắc im lặng
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  Speech.speak(text, {
    language: "de-DE",
    voice: opts.voice ?? (await germanVoice()),
    rate: opts.slow ? 0.6 : 0.95,
    onDone: opts.onEnd,
    onStopped: opts.onEnd,
    onError: opts.onEnd,
  });
}

export const stopSpeaking = () => Speech.stop();
