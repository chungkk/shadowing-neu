import "server-only";
import { connection } from "next/server";
import { parseYouTubeXml, type Segment } from "./subtitles";
import { getCached, setCached } from "./db";
import { transcribeAudio, whisperEnabled, WHISPER_MAX_BYTES } from "./whisper";

export { extractVideoId } from "./youtube-id";

/** Giá trị `lang` đặc biệt: bỏ qua phụ đề YouTube, tạo bằng Whisper */
export const WHISPER = "whisper";

export type Track = { languageCode: string; name: string; auto: boolean };

export type Transcript = {
  videoId: string;
  title: string;
  track: Track; // track đang dùng (languageCode = "whisper" nếu do Whisper tạo)
  tracks: Track[]; // các track có thể chọn (đã gồm Whisper nếu được cấu hình)
  segments: Segment[];
};

const UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
const WHISPER_TRACK: Track = { languageCode: WHISPER, name: "🤖 Whisper (AI)", auto: false };
const YOUTUBE_CACHE_MS = 7 * 24 * 3600 * 1000;

type PlayerResponse = {
  playabilityStatus?: { status?: string; reason?: string };
  videoDetails?: { title?: string; lengthSeconds?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: {
        baseUrl: string;
        languageCode: string;
        kind?: string;
        name?: { simpleText?: string; runs?: { text: string }[] };
      }[];
    };
  };
  streamingData?: {
    adaptiveFormats?: AudioFormat[];
  };
};

type AudioFormat = {
  itag: number;
  url?: string;
  mimeType: string;
  contentLength?: string;
  bitrate?: number;
  isDrc?: boolean;
};

// Client VISIONOS (giống yt-dlp 2026.08): khi gửi kèm visitorData, link audio tải được trọn file
// mà không cần PO token. Client ANDROID chỉ cho tải ~1MB đầu (≈3 phút audio).
const VISIONOS_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const VISIONOS_CLIENT = {
  clientName: "VISIONOS",
  clientVersion: "1.02",
  deviceMake: "Apple",
  deviceModel: "RealityDevice17,1",
  userAgent: VISIONOS_UA,
  osName: "visionOS",
  osVersion: "26.5.23O471",
  hl: "de",
};

// visitorData lấy từ trang watch, dùng lại trong 1 giờ
let visitor: { data: string; exp: number } | null = null;
async function getVisitorData(videoId: string): Promise<string | undefined> {
  if (visitor && visitor.exp > Date.now()) return visitor.data;
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=de`, {
    headers: { "User-Agent": VISIONOS_UA },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.text()).match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
  if (data) visitor = { data, exp: Date.now() + 3600_000 };
  return data;
}

/** Gọi player API bằng client VISIONOS (cần visitorData). Lỗi / bị chặn → trả về null. */
async function fetchVisionPlayer(videoId: string): Promise<PlayerResponse | null> {
  try {
    const visitorData = await getVisitorData(videoId);
    if (!visitorData) return null;
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": VISIONOS_UA,
        "X-YouTube-Client-Name": "101",
        "X-YouTube-Client-Version": VISIONOS_CLIENT.clientVersion,
        "X-Goog-Visitor-Id": visitorData,
      },
      body: JSON.stringify({ context: { client: { ...VISIONOS_CLIENT, visitorData } }, videoId }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const player: PlayerResponse = await res.json();
    if (player.playabilityStatus?.status !== "OK") {
      visitor = null; // visitorData có thể đã bị đánh dấu, lần sau lấy mới
      return null;
    }
    return player;
  } catch {
    return null;
  }
}

/** Lấy danh sách luồng audio tải được trọn file (client VISIONOS). Lỗi → trả về null. */
async function fetchAudioFormats(videoId: string): Promise<AudioFormat[] | null> {
  return (await fetchVisionPlayer(videoId))?.streamingData?.adaptiveFormats ?? null;
}

// Client ANDROID của Innertube trả về link phụ đề + link audio dùng được trực tiếp (không cần PO token).
// IP server (VPS/cloud) hay bị ANDROID đòi đăng nhập ("Sign in to confirm you're not a bot") → thử VISIONOS.
async function fetchPlayer(videoId: string): Promise<PlayerResponse> {
  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({
      context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", hl: "de" } },
      videoId,
    }),
    cache: "no-store",
  });
  const player: PlayerResponse | null = res.ok ? await res.json() : null;
  const status = player?.playabilityStatus?.status;
  if (player && (!status || status === "OK")) return player;

  const vision = await fetchVisionPlayer(videoId);
  if (vision) return vision;
  if (!player) throw new Error(`YouTube trả về lỗi ${res.status}`);
  throw new Error(player.playabilityStatus?.reason || `Video không khả dụng (${status})`);
}

function pickAudio(formats: AudioFormat[]): AudioFormat | undefined {
  // Bỏ bản DRC (đã nén dải động) — nghe khác bản gốc; 139 = m4a ~48kbps (≈21MB/giờ), 249 = webm opus ~50kbps
  const ok = formats.filter((f) => f.mimeType.startsWith("audio/") && f.url && f.contentLength && !f.isDrc);
  return (
    ok.find((f) => f.itag === 139) ??
    ok.find((f) => f.itag === 249) ??
    ok.sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0))[0]
  );
}

/** Tải 1 khúc; YouTube thỉnh thoảng treo request vài chục giây → timeout ngắn + thử lại. */
async function fetchRange(url: string, ua: string, a: number, b: number): Promise<ArrayBuffer> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${url}&range=${a}-${b}`, {
        headers: { "User-Agent": ua },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) return await res.arrayBuffer();
      lastStatus = res.status;
      if (res.status === 403 || res.status === 400) break; // bị chặn, thử lại vô ích
    } catch {
      // timeout / lỗi mạng → thử lại
    }
  }
  if (lastStatus === 403 || lastStatus === 400) {
    throw new Error(
      "YouTube chặn tải audio của video này. " +
        "Hãy dùng phụ đề YouTube, hoặc tải file audio/video lên ở mục “File trên máy”.",
    );
  }
  throw new Error(`Không tải được audio${lastStatus ? ` (${lastStatus})` : " (hết thời gian chờ)"}`);
}

/**
 * Tải audio nhỏ nhất của video. YouTube bóp băng thông khi tải nguyên file (~7KB/s),
 * nhưng tải theo từng khúc `&range=` song song thì gần như tức thì.
 * Ưu tiên client VISIONOS (tải được video dài); không được thì dùng luồng của client ANDROID
 * (chỉ video ngắn dưới ~3 phút).
 */
async function downloadAudio(videoId: string, player: PlayerResponse): Promise<{ blob: Blob; filename: string }> {
  const visionFormats = await fetchAudioFormats(videoId);
  const vf = visionFormats && pickAudio(visionFormats);
  const af = pickAudio(player.streamingData?.adaptiveFormats ?? []);
  const f = vf ?? af;
  const ua = vf ? VISIONOS_UA : UA;
  if (!f) throw new Error("Không tìm thấy luồng audio của video.");

  const size = Number(f.contentLength);
  if (size > WHISPER_MAX_BYTES) throw new Error("Video quá dài để tạo phụ đề bằng Whisper (tối đa khoảng 1 giờ).");
  if (!vf && size > 2 * 1024 * 1024) {
    // Client ANDROID chỉ cho tải ~1–2MB đầu → báo luôn, khỏi tải dở
    throw new Error(
      "YouTube chặn tải audio của video này (hiện chỉ video ngắn dưới ~3 phút mới tải được). " +
        "Hãy dùng phụ đề YouTube, hoặc tải file audio/video lên ở mục “File trên máy”.",
    );
  }

  const CHUNK = 1024 * 1024;
  const ranges: [number, number][] = [];
  for (let s = 0; s < size; s += CHUNK) ranges.push([s, Math.min(s + CHUNK, size) - 1]);

  // Hàng đợi 6 luồng song song (1 khúc chậm không chặn cả lượt)
  const parts: ArrayBuffer[] = new Array(ranges.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(6, ranges.length) }, async () => {
      while (next < ranges.length) {
        const i = next++;
        parts[i] = await fetchRange(f.url!, ua, ...ranges[i]);
      }
    }),
  );

  const mime = f.mimeType.split(";")[0];
  return { blob: new Blob(parts, { type: mime }), filename: mime === "audio/webm" ? "audio.webm" : "audio.m4a" };
}

async function fetchCaptions(url: string): Promise<Segment[]> {
  const res = await fetch(url.replace(/&fmt=[^&]*/, ""), { cache: "no-store" });
  if (!res.ok) throw new Error(`Không tải được phụ đề (${res.status})`);
  return parseYouTubeXml(await res.text());
}

/**
 * Lấy phụ đề cho video:
 * - `lang` = mã ngôn ngữ → track YouTube đó
 * - `lang` = "whisper"   → tạo bằng Whisper
 * - không truyền         → ưu tiên tiếng Đức thủ công > tiếng Đức tự động > track đầu tiên;
 *                          video không có phụ đề → tự dùng Whisper (nếu đã cấu hình)
 * Kết quả được cache trong SQLite (Whisper: vĩnh viễn, YouTube: 7 ngày).
 * `whisper: false` (khách chưa đăng nhập) → không được chạy Whisper mới (tốn tiền API),
 * nhưng vẫn dùng được kết quả Whisper đã có trong cache.
 */
export async function getYouTubeTranscript(
  videoId: string,
  lang?: string,
  { whisper = false }: { whisper?: boolean } = {},
): Promise<Transcript> {
  await connection(); // luôn chạy lúc request (đọc cache có hạn dùng Date.now())
  const cacheKey = `yt:${videoId}:${lang || "default"}`;
  const cached = getCached<Transcript>(cacheKey);
  if (cached) return cached;

  // Whisper đã từng chạy cho video này → dùng lại, khỏi tốn tiền
  if (lang === WHISPER || !lang) {
    const w = getCached<Transcript>(`yt:${videoId}:${WHISPER}`);
    if (w && (lang === WHISPER || w.tracks.length === 1)) return w;
  }

  const player = await fetchPlayer(videoId);
  const title = player.videoDetails?.title ?? videoId;
  const ytTracks = (player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []).map((t) => ({
    track: {
      languageCode: t.languageCode,
      name: t.name?.simpleText ?? t.name?.runs?.map((r) => r.text).join("") ?? t.languageCode,
      auto: t.kind === "asr",
    },
    baseUrl: t.baseUrl,
  }));
  const canWhisper = whisper && whisperEnabled();
  const tracks = [...ytTracks.map((t) => t.track), ...(canWhisper ? [WHISPER_TRACK] : [])];

  let result: Transcript;
  if (lang !== WHISPER && ytTracks.length) {
    const de = ytTracks.filter((t) => t.track.languageCode.startsWith("de"));
    const picked =
      (lang && ytTracks.find((t) => t.track.languageCode === lang)) ||
      de.find((t) => !t.track.auto) ||
      de[0] ||
      ytTracks[0];
    const segments = await fetchCaptions(picked.baseUrl);
    if (!segments.length) throw new Error("Phụ đề rỗng hoặc không đọc được.");
    result = { videoId, title, track: picked.track, tracks, segments };
    setCached(cacheKey, result, YOUTUBE_CACHE_MS);
  } else {
    if (!whisper) {
      throw new Error(
        (lang === WHISPER ? "" : "Video này không có phụ đề. ") + "Đăng nhập để tạo phụ đề bằng Whisper (AI).",
      );
    }
    if (!whisperEnabled()) {
      throw new Error(
        (lang === WHISPER ? "Whisper chưa được bật." : "Video này không có phụ đề.") +
          " Cấu hình Whisper (TRANSCRIBE_API_KEY hoặc TRANSCRIBE_API_URL) trong .env.local để tự tạo phụ đề.",
      );
    }
    const { blob, filename } = await downloadAudio(videoId, player);
    const segments = await transcribeAudio(blob, filename);
    if (!segments.length) throw new Error("Whisper không nhận dạng được câu nào.");
    result = { videoId, title, track: WHISPER_TRACK, tracks, segments };
    setCached(`yt:${videoId}:${WHISPER}`, result, null);
  }
  return result;
}
