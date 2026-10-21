import { setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";

/**
 * Đọc tiếng Đức bằng giọng có sẵn của máy (expo-speech, offline, miễn phí).
 * Ưu tiên giọng chất lượng cao (Enhanced) nếu người dùng đã tải trong Cài đặt → Trợ năng → Nội dung được đọc.
 */

let voice: string | undefined;
let looked = false;

async function germanVoice(): Promise<string | undefined> {
  if (looked) return voice;
  looked = true;
  try {
    const de = (await Speech.getAvailableVoicesAsync()).filter((v) => v.language.toLowerCase().startsWith("de"));
    voice = (de.find((v) => v.quality === Speech.VoiceQuality.Enhanced && v.language === "de-DE") ?? de.find((v) => v.language === "de-DE") ?? de[0])
      ?.identifier;
  } catch {}
  return voice;
}

export async function speakGerman(text: string, opts: { slow?: boolean; onEnd?: () => void } = {}) {
  await Speech.stop();
  // Vẫn có tiếng khi gạt công tắc im lặng
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  Speech.speak(text, {
    language: "de-DE",
    voice: await germanVoice(),
    rate: opts.slow ? 0.6 : 0.95,
    onDone: opts.onEnd,
    onStopped: opts.onEnd,
    onError: opts.onEnd,
  });
}

export const stopSpeaking = () => Speech.stop();
