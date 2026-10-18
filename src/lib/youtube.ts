import "server-only";
import { connection } from "next/server";
import { normalize, parseYouTubeXml, type Segment } from "./subtitles";
import { getCached, setCached } from "./db";
import { transcribeAudio, whisperEnabled, WHISPER_MAX_BYTES } from "./whisper";
import { addPunctuation, lacksPunctuation, punctuationEnabled } from "./punctuate";
import { YtdlpMissingError, ytdlpAudio, ytdlpCaptions, ytdlpVideo } from "./ytdlp";

export { extractVideoId } from "./youtube-id";

/** Giá trị `lang` đặc biệt: bỏ qua phụ đề YouTube, tạo bằng Whisper */
export const WHISPER = "whisper";

export type Track = { languageCode: string; name: string; auto: boolean };

export type Transcript = {
  contributedBy?: number; // id người dùng app đã gửi phụ đề này lên (lấy trên điện thoại)
  videoId: string;
  title: string;
  track: Track; // track đang dùng (languageCode = "whisper" nếu do Whisper tạo)
  tracks: Track[]; // các track có thể chọn (đã gồm Whisper nếu được cấu hình)
  segments: Segment[];
};

const UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
const isGerman = (t: Track) => t.languageCode.startsWith("de");

/** Bản cache cũ có thể lẫn track ngôn ngữ khác → lọc lại; track đang dùng không phải tiếng Đức thì bỏ cache */
function germanOnly(t: Transcript | null): Transcript | null {
  if (!t || (t.track.languageCode !== WHISPER && !isGerman(t.track))) return null;
  return { ...t, tracks: t.tracks.filter((x) => x.languageCode === WHISPER || isGerman(x)) };
}
const WHISPER_TRACK: Track = { languageCode: WHISPER, name: "🤖 Whisper (AI)", auto: false };

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
  const reason = player.playabilityStatus?.reason ?? "";
  if (/in deinem Land|in your country/i.test(reason)) throw new GeoBlockedError();
  throw new Error(reason || `Video không khả dụng (${status})`);
}

/** Video bị chủ kênh giới hạn quốc gia (vd. ARD/WDR chỉ cho xem ở Đức) — yt-dlp cũng không tải được */
class GeoBlockedError extends Error {
  constructor() {
    super(
      "Video này chỉ cho xem ở một số quốc gia (thường là video của đài truyền hình Đức như ARD, WDR, ZDF), " +
        "server không lấy được phụ đề. Hãy tải video về máy rồi dùng mục “File trên máy”.",
    );
  }
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
  // srv3: phụ đề tự động có thời gian từng từ (để cắt câu chính xác)
  const res = await fetch(url.replace(/&fmt=[^&]*/, "") + "&fmt=srv3", { cache: "no-store" });
  if (!res.ok) throw new Error(`Không tải được phụ đề (${res.status})`);
  return parseYouTubeXml(await res.text());
}

/** Thử cách thường (Innertube); lỗi thì dùng yt-dlp. Server không có yt-dlp → báo lỗi gốc. */
async function orYtdlp<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await primary();
  } catch (e) {
    if (e instanceof GeoBlockedError) throw e; // yt-dlp cũng bị chặn theo quốc gia → khỏi thử, giữ lý do rõ ràng
    try {
      return await fallback();
    } catch (err) {
      throw err instanceof YtdlpMissingError ? e : err;
    }
  }
}

type Source = {
  title: string;
  tracks: { track: Track; load: () => Promise<Segment[]> }[];
  audio: () => Promise<{ blob: Blob; filename: string }>;
};

async function fromInnertube(videoId: string): Promise<Source> {
  const player = await fetchPlayer(videoId);
  return {
    title: player.videoDetails?.title ?? videoId,
    tracks: (player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []).map((t) => {
      const track: Track = {
        languageCode: t.languageCode,
        name: t.name?.simpleText ?? t.name?.runs?.map((r) => r.text).join("") ?? t.languageCode,
        auto: t.kind === "asr",
      };
      return {
        track,
        load: () =>
          orYtdlp(
            () => fetchCaptions(t.baseUrl),
            () => ytdlpCaptions(videoId, track),
          ),
      };
    }),
    audio: () =>
      orYtdlp(
        () => downloadAudio(videoId, player),
        () => ytdlpAudio(videoId, WHISPER_MAX_BYTES),
      ),
  };
}

async function fromYtdlp(videoId: string): Promise<Source> {
  const { title, tracks } = await ytdlpVideo(videoId);
  return {
    title,
    tracks: tracks.map(({ languageCode, name, auto }) => {
      const track: Track = { languageCode, name, auto };
      return { track, load: () => ytdlpCaptions(videoId, track) };
    }),
    audio: () => ytdlpAudio(videoId, WHISPER_MAX_BYTES),
  };
}

/**
 * Lấy phụ đề cho video:
 * - `lang` = mã ngôn ngữ → track YouTube đó
 * - `lang` = "whisper"   → tạo bằng Whisper
 * - không truyền         → ưu tiên phụ đề tiếng Đức có sẵn trên YouTube (thủ công > tự động);
 *                          không có tiếng Đức / tải phụ đề lỗi → tự dùng Whisper (Groq) nếu được phép
 * Chỉ dùng phụ đề tiếng Đức. Kết quả lưu vĩnh viễn trong SQLite (cả YouTube lẫn Whisper):
 * ai lấy phụ đề video nào thì người sau mở cùng video có ngay.
 * `whisper: false` (khách chưa đăng nhập) → không được chạy Whisper mới (tốn tiền API),
 * nhưng vẫn dùng được kết quả Whisper đã có trong cache.
 */
export async function getYouTubeTranscript(
  videoId: string,
  lang?: string,
  { whisper = false }: { whisper?: boolean } = {},
): Promise<Transcript> {
  await connection(); // luôn chạy lúc request (đọc cache có hạn dùng Date.now())
  // "ytp:" — bản có thêm dấu câu cho phụ đề tự động (đổi tiền tố để không dùng lại cache cũ chưa có dấu câu)
  const cacheKey = `ytp:${videoId}:${lang || "default"}`;
  const cached = germanOnly(getCached<Transcript>(cacheKey));
  if (cached) return cached;

  // Whisper đã từng chạy cho video này → dùng lại, khỏi tốn tiền
  if (lang === WHISPER || !lang) {
    const w = germanOnly(getCached<Transcript>(`yt:${videoId}:${WHISPER}`));
    if (w && (lang === WHISPER || !w.tracks.some((t) => isGerman(t)))) return w;
  }

  // IP server (VPS) bị YouTube chặn ("…kein Bot…") → dùng yt-dlp + PO token
  const { title, tracks: allTracks, audio } = await orYtdlp(
    () => fromInnertube(videoId),
    () => fromYtdlp(videoId),
  );
  const canWhisper = whisper && whisperEnabled();
  // App học tiếng Đức → chỉ dùng phụ đề tiếng Đức (bỏ các track ngôn ngữ khác)
  const de = allTracks.filter((t) => isGerman(t.track));
  const tracks = [...de.map((t) => t.track), ...(canWhisper ? [WHISPER_TRACK] : [])];

  // Phụ đề YouTube có sẵn được ưu tiên (miễn phí, nhanh); Whisper chỉ là phương án sau
  let picked: (typeof de)[number] | undefined;
  if (lang !== WHISPER) {
    picked =
      (lang && de.find((t) => t.track.languageCode === lang)) ||
      de.find((t) => !t.track.auto) || // ưu tiên phụ đề do người làm
      de[0]; // không có tiếng Đức → Whisper (bên dưới)
  }
  if (picked) {
    let ytError: Error;
    try {
      let segments = await picked.load();
      // Phụ đề tự động không có dấu câu → nhờ mô hình ngôn ngữ thêm vào (để chia được thành câu)
      if (picked.track.auto && punctuationEnabled() && lacksPunctuation(segments)) {
        segments = await addPunctuation(segments);
      }
      if (segments.length) {
        const result = { videoId, title, track: picked.track, tracks, segments };
        // Lưu vĩnh viễn: người sau mở cùng video có phụ đề ngay (cả theo mã track cụ thể)
        setCached(cacheKey, result, null);
        if (!lang) setCached(`ytp:${videoId}:${picked.track.languageCode}`, result, null);
        return result;
      }
      ytError = new Error("Phụ đề rỗng hoặc không đọc được.");
    } catch (e) {
      ytError = e as Error;
    }
    if (!canWhisper) throw ytError; // phụ đề YouTube lỗi → thử Whisper nếu được phép
  }

  // Không có phụ đề tiếng Đức (hoặc tải lỗi) → tạo bằng Whisper (Groq)
  if (!whisper) {
    throw new Error(
      (lang === WHISPER ? "" : "Video này không có phụ đề tiếng Đức. ") + "Đăng nhập để tạo phụ đề bằng Whisper (AI).",
    );
  }
  if (!whisperEnabled()) {
    throw new Error(
      (lang === WHISPER ? "Whisper chưa được bật." : "Video này không có phụ đề tiếng Đức.") +
        " Cấu hình Whisper (TRANSCRIBE_API_KEY hoặc TRANSCRIBE_API_URL) trong .env.local để tự tạo phụ đề.",
    );
  }
  const { blob, filename } = await audio();
  const segments = await transcribeAudio(blob, filename);
  if (!segments.length) throw new Error("Whisper không nhận dạng được câu nào.");
  const result = { videoId, title, track: WHISPER_TRACK, tracks, segments };
  setCached(`yt:${videoId}:${WHISPER}`, result, null);
  return result;
}

/** Phụ đề đã lưu (không gọi YouTube) — app hỏi trước khi tự lấy trên điện thoại */
export async function getSavedTranscript(videoId: string): Promise<Transcript | null> {
  await connection();
  return (
    germanOnly(getCached<Transcript>(`ytp:${videoId}:default`)) ??
    germanOnly(getCached<Transcript>(`yt:${videoId}:${WHISPER}`))
  );
}

/**
 * Lưu phụ đề app lấy được trên điện thoại (IP nhà mạng nên YouTube không chặn như VPS).
 * Chỉ nhận phụ đề tiếng Đức, kiểm tra dữ liệu, thêm dấu câu nếu là phụ đề tự động chưa có dấu câu.
 * Video đã có phụ đề lưu sẵn thì giữ bản cũ (admin xoá được ở trang "Phụ đề đã lưu").
 */
export async function saveUploadedTranscript(
  videoId: string,
  input: { title?: unknown; track?: unknown; tracks?: unknown; segments?: unknown },
  userId: number,
): Promise<Transcript | string> {
  const existing = await getSavedTranscript(videoId);
  if (existing) return existing;

  const isTrack = (t: unknown): t is Track =>
    !!t &&
    typeof (t as Track).languageCode === "string" &&
    typeof (t as Track).name === "string" &&
    typeof (t as Track).auto === "boolean";
  const track = input.track;
  if (!isTrack(track) || !isGerman(track)) return "Chỉ nhận phụ đề tiếng Đức";
  const tracks = (Array.isArray(input.tracks) ? input.tracks : []).filter(isTrack).filter(isGerman).slice(0, 10);
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 200) : "";
  const raw = Array.isArray(input.segments) ? input.segments : [];
  if (!title || !raw.length || raw.length > 20_000) return "Dữ liệu phụ đề không hợp lệ";

  const segments: Segment[] = [];
  for (const r of raw as Segment[]) {
    const ok =
      r &&
      Number.isFinite(r.start) &&
      Number.isFinite(r.end) &&
      r.start >= 0 &&
      r.end >= r.start &&
      r.end < 24 * 3600 &&
      typeof r.text === "string" &&
      r.text.length <= 500;
    if (!ok) return "Dữ liệu phụ đề không hợp lệ";
    const words = Array.isArray(r.words)
      ? r.words.filter((w): w is [number, string] => Number.isFinite(w?.[0]) && typeof w?.[1] === "string")
      : undefined;
    segments.push({ start: r.start, end: r.end, text: r.text.trim(), ...(words?.length ? { words } : {}) });
  }

  let clean = normalize(segments);
  if (!clean.length) return "Phụ đề trống";
  if (track.auto && punctuationEnabled() && lacksPunctuation(clean)) clean = await addPunctuation(clean);

  const result: Transcript = {
    videoId,
    title,
    track,
    tracks: tracks.some((t) => t.languageCode === track.languageCode) ? tracks : [track, ...tracks],
    segments: clean,
    contributedBy: userId,
  };
  setCached(`ytp:${videoId}:default`, result, null);
  setCached(`ytp:${videoId}:${track.languageCode}`, result, null);
  return result;
}
