import { apiAdmin, fail } from "@/lib/api";
import { dubEnabled, dubJson, type DubHealth, type DubJob, type DubVoice } from "@/lib/dub";
import { translationEnabled } from "@/lib/translate";
import { whisperEnabled } from "@/lib/whisper";

export async function GET() {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;

  if (!dubEnabled()) {
    return Response.json({
      enabled: false,
      translationEnabled: translationEnabled(),
      whisperEnabled: whisperEnabled(),
      health: null,
      voices: [],
      jobs: [],
    });
  }

  try {
    const [health, voicesRes, jobsRes] = await Promise.all([
      dubJson<DubHealth>("/health", { timeoutMs: 8_000 }),
      dubJson<{ voices: DubVoice[] }>("/voices", { timeoutMs: 8_000 }),
      dubJson<{ jobs: DubJob[] }>("/jobs", { timeoutMs: 8_000 }),
    ]);
    return Response.json({
      enabled: true,
      translationEnabled: translationEnabled(),
      whisperEnabled: whisperEnabled(),
      health,
      voices: voicesRes.voices,
      jobs: jobsRes.jobs,
    });
  } catch (e) {
    return fail(`Không kết nối được dịch vụ VieNeu-TTS: ${(e as Error).message}`, 502);
  }
}
