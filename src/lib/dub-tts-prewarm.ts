import "server-only";
import { EDGE_TTS_MAX_CHARS, isEdgeVoice, normalizeEdgeSpeed, synthesizeEdgeDub } from "./edge-tts";
import { isServerPiperVoice, synthesizePiperDub } from "./piper-tts";

const MAX_FIT_SPEED = 1.45;

export function estimateViDurSec(text: string, speed: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const pauses = (text.match(/[,;:.!?…]/g) ?? []).length;
  return (words * 0.27 + pauses * 0.14 + 0.18) / Math.max(0.75, speed);
}

export function truncateTtsText(text: string, maxChars = EDGE_TTS_MAX_CHARS): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","), cut.lastIndexOf("."));
  return (lastBreak > maxChars * 0.6 ? cut.slice(0, lastBreak) : cut).trim();
}

export function computeCueFitSpeed(text: string, baseSpeed: number, slotSec: number): number {
  const normSpd = normalizeEdgeSpeed(baseSpeed);
  let firstSpd = normSpd;
  if (slotSec > 0.4 && normSpd < MAX_FIT_SPEED) {
    const estDur = estimateViDurSec(text, normSpd);
    if (estDur > slotSec + 0.15) {
      firstSpd = Math.min(MAX_FIT_SPEED, Math.ceil(((normSpd * estDur) / slotSec) * 20) / 20);
    }
  }
  return firstSpd;
}

export type PrewarmCueLike = {
  start_ms: number;
  end_ms: number;
  text: string;
  pending?: boolean;
};

/**
 * Tạo sẵn ngầm audio cho 3–4 câu đầu ngay khi chuẩn bị phụ đề xong (hoặc khi vừa mở từ cache),
 * khớp đúng công thức tốc độ `computeCueFitSpeed` của client để khi người dùng nhận phụ đề là audio đã sẵn trong RAM/đĩa.
 */
export function prewarmDubAudio(
  cues: PrewarmCueLike[],
  voiceId: string,
  speed = 1.15,
  startMs = 0,
): void {
  const edgeVoice = isEdgeVoice(voiceId) ? voiceId : null;
  const piperVoice = !edgeVoice && isServerPiperVoice(voiceId) ? voiceId : null;
  if (!edgeVoice && !piperVoice) return;
  if (!cues.length) return;

  const baseIdx = Math.max(0, cues.findIndex((c) => startMs <= c.end_ms + 800));
  const limit = edgeVoice ? 4 : 3;
  let scheduled = 0;

  for (let i = baseIdx; i < cues.length && scheduled < limit; i++) {
    const cue = cues[i];
    if (!cue || cue.pending) continue;
    const text = truncateTtsText(cue.text);
    if (!text) continue;

    const next = cues[i + 1];
    const slotSec = next ? (next.start_ms - cue.start_ms) / 1000 - 0.1 : 0;
    const fitSpd = computeCueFitSpeed(text, speed, slotSec);
    const priority = scheduled === 0 ? "urgent" : "normal";
    scheduled++;

    if (edgeVoice) {
      void synthesizeEdgeDub(text, edgeVoice, fitSpd).catch(() => {});
    } else if (piperVoice) {
      void synthesizePiperDub(text, piperVoice, fitSpd, { priority }).catch(() => {});
    }
  }
}
