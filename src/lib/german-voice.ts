import { useSyncExternalStore } from "react";

/** Giọng đọc tiếng Đức của trình duyệt (Web Speech API) — dùng ở màn ôn tập và trang bộ từ */

const voiceStore = {
  subscribe(cb: () => void) {
    if (typeof speechSynthesis === "undefined") return () => {};
    speechSynthesis.addEventListener("voiceschanged", cb);
    return () => speechSynthesis.removeEventListener("voiceschanged", cb);
  },
  /** Chrome nạp danh sách giọng không đồng bộ → lúc đầu có thể chưa có */
  germanVoice: () => (typeof speechSynthesis === "undefined" ? undefined : speechSynthesis.getVoices().find((v) => v.lang.startsWith("de"))),
};
export const useHasGermanVoice = () => useSyncExternalStore(voiceStore.subscribe, () => !!voiceStore.germanVoice(), () => false);

export function speak(text: string, rate = 0.9) {
  const voice = voiceStore.germanVoice();
  if (!voice) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = rate;
  speechSynthesis.speak(u);
}
