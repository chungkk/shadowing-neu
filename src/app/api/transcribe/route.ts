import { transcribeAudio, whisperEnabled } from "@/lib/whisper";

/**
 * Nhận 1 đoạn audio (WAV 16kHz mono đã được cắt ở trình duyệt) + offset (giây),
 * trả về các segment có timestamp đã cộng offset.
 */
export async function POST(req: Request) {
  if (!whisperEnabled()) {
    return Response.json(
      { error: "Chưa cấu hình Whisper trong .env.local (xem README)." },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const offset = Number(form.get("offset") ?? 0);
  if (!(file instanceof Blob)) return Response.json({ error: "Thiếu file" }, { status: 400 });

  try {
    return Response.json({ segments: await transcribeAudio(file, "audio.wav", offset) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
