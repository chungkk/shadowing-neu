import "server-only";
import { connection } from "next/server";
import { cleanSegmentWords, cleanSubtitleText, normalize, parseYouTubeXml, type Segment } from "./subtitles";
import { getCached, setCached } from "./db";
import { transcribeAudio, whisperEnabled, whisperVersion, WHISPER_MAX_BYTES, type WhisperVersion } from "./whisper";
import { addPunctuation, lacksPunctuation, punctuationEnabled } from "./punctuate";
import { MIN_MATCH, transferPunctuation } from "./punct-transfer";
import { YtdlpMissingError, ytdlpAudio, ytdlpCaptions, ytdlpVideo } from "./ytdlp";
import { allow } from "./rate-limit";

export { extractVideoId } from "./youtube-id";

/** Giá trị `lang` đặc biệt: bỏ qua phụ đề YouTube, tạo bằng Whisper. "whisper" = v1 (mã cũ, giữ để dùng lại phụ đề đã lưu) */
export const WHISPER = "whisper";
export const WHISPER_V2 = "whisper-v2";
export const isWhisper = (code?: string) => code === WHISPER || code === WHISPER_V2;
/** "Original + Whisper": chữ + thời gian của phụ đề YouTube tiếng Đức, dấu câu chép từ Whisper v2 */
export const ORIGINAL_WHISPER = "original-whisper";
const whisperCode = (v: WhisperVersion) => (v === "v1" ? WHISPER : WHISPER_V2);
/** Mã Whisper mặc định (theo WHISPER_VERSION) — dùng khi tự tạo phụ đề bằng Whisper */
export const defaultWhisper = () => whisperCode(whisperVersion());

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
  if (!t || (!isWhisper(t.track.languageCode) && t.track.languageCode !== ORIGINAL_WHISPER && !isGerman(t.track))) return null;
  const hasWhisper = t.tracks.some((x) => isWhisper(x.languageCode));
  const hasMix = t.tracks.some((x) => x.languageCode === ORIGINAL_WHISPER);
  return {
    ...t,
    // Bản lưu cũ chỉ có 1 lựa chọn "Whisper (AI)" → luôn hiện đủ v1 + v2, tên track theo đúng phiên bản
    track: isWhisper(t.track.languageCode) ? WHISPER_TRACKS[t.track.languageCode === WHISPER ? "v1" : "v2"] : t.track,
    tracks: [...t.tracks.filter(isGerman), ...(hasMix ? [MIX_TRACK] : []), ...(hasWhisper ? Object.values(WHISPER_TRACKS) : [])],
  };
}
/** Khách (không phải admin) chỉ lấy được phụ đề mới cho video tối đa 30 phút (video dài: tải audio / Whisper hay lỗi, tốn tiền) */
export const MAX_VIDEO_SECONDS = 30 * 60;

const WHISPER_TRACKS: Record<WhisperVersion, Track> = {
  v1: { languageCode: WHISPER, name: "🤖 Whisper v1", auto: false },
  v2: { languageCode: WHISPER_V2, name: "🤖 Whisper v2", auto: false },
};
const MIX_TRACK: Track = { languageCode: ORIGINAL_WHISPER, name: "🤖 Original + Whisper", auto: false };

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
  // Video có nhiều track audio (YouTube tự lồng tiếng AI sang ngôn ngữ khác): mỗi itag có 1 bản / track
  audioTrack?: { displayName?: string; isAutoDubbed?: boolean };
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

/** Video dài quá giới hạn cho khách — báo trước khi tải gì (thông báo hiện thẳng cho người dùng) */
export class VideoTooLongError extends Error {
  constructor(duration: number, max: number) {
    super(
      `Video này dài ${Math.round(duration / 60)} phút — hiện chỉ hỗ trợ video tối đa ${Math.round(max / 60)} phút. ` +
        "Bạn chọn video ngắn hơn nhé.",
    );
  }
}

/** Video bị chủ kênh giới hạn quốc gia (vd. ARD/WDR chỉ cho xem ở Đức) — yt-dlp cũng không tải được */
class GeoBlockedError extends Error {
  constructor() {
    super(
      "Video này chỉ cho xem ở một số quốc gia (thường là video của đài truyền hình Đức như ARD, WDR, ZDF), " +
        "server không lấy được phụ đề. Hãy chọn video khác.",
    );
  }
}

function pickAudio(formats: AudioFormat[]): AudioFormat | undefined {
  // Bỏ bản DRC (đã nén dải động) — nghe khác bản gốc; 139 = m4a ~48kbps (≈21MB/giờ), 249 = webm opus ~50kbps
  const all = formats.filter((f) => f.mimeType.startsWith("audio/") && f.url && f.contentLength && !f.isDrc);
  // Chỉ lấy giọng GỐC: bản lồng tiếng (vd. tiếng Anh do AI) cùng itag 139 hay đứng trước → Whisper nghe tiếng Anh
  // rồi "dịch" sang tiếng Đức. Track gốc có xtags "acont=original" trong link.
  const original = all.filter(
    (f) => !f.audioTrack || /acont(%3D|=)original/.test(f.url ?? "") || /original/i.test(f.audioTrack.displayName ?? ""),
  );
  const ok = original.length ? original : all.filter((f) => !f.audioTrack?.isAutoDubbed);
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
        "Hãy dùng phụ đề YouTube của video.",
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
        "Hãy dùng phụ đề YouTube của video.",
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
  duration?: number; // giây (YouTube có thể không trả về)
  tracks: { track: Track; load: () => Promise<Segment[]> }[];
  audio: () => Promise<{ blob: Blob; filename: string }>;
};

async function fromInnertube(videoId: string): Promise<Source> {
  const player = await fetchPlayer(videoId);
  return {
    title: player.videoDetails?.title ?? videoId,
    duration: Number(player.videoDetails?.lengthSeconds) || undefined,
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
  const { title, duration, tracks } = await ytdlpVideo(videoId);
  return {
    title,
    duration,
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
 * - `lang` = "whisper" / "whisper-v2" → tạo bằng Whisper v1 / v2
 * - không truyền         → ưu tiên phụ đề tiếng Đức có sẵn trên YouTube (thủ công > tự động);
 *                          không có tiếng Đức / tải phụ đề lỗi → tự dùng Whisper (Groq) nếu được phép
 * Chỉ dùng phụ đề tiếng Đức. Kết quả lưu vĩnh viễn trong SQLite (cả YouTube lẫn Whisper):
 * ai lấy phụ đề video nào thì người sau mở cùng video có ngay.
 * `whisper: false` (khách chưa đăng nhập) → không được chạy Whisper mới (tốn tiền API),
 * nhưng vẫn dùng được kết quả Whisper đã có trong cache.
 * `maxSeconds`: video dài hơn → báo lỗi trước khi tải phụ đề / audio (phụ đề đã lưu sẵn vẫn mở được).
 */
export async function getYouTubeTranscript(
  videoId: string,
  lang?: string,
  { whisper = false, quotaKey, maxSeconds }: { whisper?: boolean; quotaKey?: string; maxSeconds?: number } = {},
): Promise<Transcript> {
  await connection(); // luôn chạy lúc request (đọc cache có hạn dùng Date.now())
  // "ytp:" — bản có thêm dấu câu cho phụ đề tự động (đổi tiền tố để không dùng lại cache cũ chưa có dấu câu)
  const cacheKey = `ytp:${videoId}:${lang || "default"}`;
  const cached = germanOnly(getCached<Transcript>(cacheKey));
  if (cached) return cached;

  // Whisper đã từng chạy cho video này → dùng lại, khỏi tốn tiền
  if (isWhisper(lang) || !lang) {
    const codes = lang ? [lang] : [defaultWhisper(), defaultWhisper() === WHISPER ? WHISPER_V2 : WHISPER];
    for (const code of codes) {
      const w = germanOnly(getCached<Transcript>(`yt:${videoId}:${code}`));
      if (w && (lang || !w.tracks.some((t) => isGerman(t)))) return w;
    }
  }

  // Cùng video đang được lấy (người khác vừa mở) → chờ chung một lần, không gọi YouTube/LLM/Whisper lặp lại
  const flightKey = `${videoId}:${lang || "default"}:${whisper ? 1 : 0}:${maxSeconds ?? 0}`;
  const pending = inflight.get(flightKey);
  if (pending) return pending;

  // Chỉ tính hạn mức khi thật sự phải lấy mới (mở video đã có cache thì không tốn lượt)
  if (quotaKey && !allow(`ytfetch:${quotaKey}`, FETCH_MAX, FETCH_WINDOW)) {
    throw new Error("Bạn mở quá nhiều video mới trong thời gian ngắn. Thử lại sau ít phút nhé.");
  }
  if (active.n >= MAX_CONCURRENT_FETCHES) {
    throw new Error("Máy chủ đang bận lấy phụ đề cho video khác. Thử lại sau ít phút nhé.");
  }
  active.n++;
  const p = fetchTranscript(videoId, cacheKey, lang, whisper, quotaKey, maxSeconds).finally(() => {
    active.n--;
    inflight.delete(flightKey);
  });
  inflight.set(flightKey, p);
  return p;
}

// Lấy phụ đề mới tốn tài nguyên (yt-dlp chạy tới vài phút, LLM thêm dấu câu, Whisper) → giới hạn
const FETCH_MAX = 10; // video mới / người (hoặc IP với khách) / 10 phút
const FETCH_WINDOW = 10 * 60_000;
const WHISPER_PER_DAY = 5; // lần chạy Whisper / người / ngày
const MAX_CONCURRENT_FETCHES = 3; // số lần lấy phụ đề chạy cùng lúc trên server
const UPLOADS_PER_DAY = 20; // phụ đề app gửi lên / người / ngày
const UPLOAD_MAX_SEGMENTS = 5_000; // ~ video vài giờ
const UPLOAD_MAX_CHARS = 300_000;

// Để ở globalThis → dùng chung giữa các route (mỗi route có bản module riêng)
const gy = globalThis as unknown as { __ytInflight?: Map<string, Promise<Transcript>>; __ytActive?: { n: number } };
const inflight = (gy.__ytInflight ??= new Map());
const active = (gy.__ytActive ??= { n: 0 });

async function fetchTranscript(
  videoId: string,
  cacheKey: string,
  lang: string | undefined,
  whisper: boolean,
  quotaKey: string | undefined,
  maxSeconds?: number,
): Promise<Transcript> {

  // IP server (VPS) bị YouTube chặn ("…kein Bot…") → dùng yt-dlp + PO token
  const { title, duration, tracks: allTracks, audio } = await orYtdlp(
    () => fromInnertube(videoId),
    () => fromYtdlp(videoId),
  );
  if (maxSeconds && duration && duration > maxSeconds) throw new VideoTooLongError(duration, maxSeconds);
  const canWhisper = whisper && whisperEnabled();
  // App học tiếng Đức → chỉ dùng phụ đề tiếng Đức (bỏ các track ngôn ngữ khác)
  const de = allTracks.filter((t) => isGerman(t.track));
  const tracks = [
    ...de.map((t) => t.track),
    ...(canWhisper && de.length ? [MIX_TRACK] : []),
    ...(canWhisper ? Object.values(WHISPER_TRACKS) : []),
  ];

  /** Chạy Whisper (tính hạn mức / ngày), lưu kết quả theo phiên bản thật đã dùng */
  const runWhisper = async (want: WhisperVersion): Promise<Transcript> => {
    if (quotaKey && !allow(`whisper:${quotaKey}`, WHISPER_PER_DAY, 24 * 3600_000)) {
      throw new Error(`Mỗi ngày chỉ tạo được ${WHISPER_PER_DAY} phụ đề bằng Whisper. Mai thử lại nhé.`);
    }
    const { blob, filename } = await audio();
    // v2 lỗi thì transcribeAudio tự chạy v1 → lưu theo phiên bản thật đã dùng
    const r = await transcribeAudio(blob, filename, 0, { version: want });
    const { version } = r;
    let { segments } = r;
    // v2: Whisper đôi khi viết liền một mạch, ít dấu chấm → không cắt được câu. Thêm dấu câu bằng LLM
    // (giữ nguyên chữ + thời gian từng từ), giống phụ đề tự động của YouTube. v1 giữ nguyên như cũ.
    if (version === "v2" && punctuationEnabled() && lacksPunctuation(segments)) segments = await addPunctuation(segments);
    if (!segments.length) throw new Error("Whisper không nhận dạng được câu nào.");
    const result = { videoId, title, track: WHISPER_TRACKS[version], tracks, segments };
    setCached(`yt:${videoId}:${whisperCode(version)}`, result, null);
    return result;
  };

  // "Original + Whisper": phụ đề YouTube (ưu tiên bản tự động "Original") + dấu câu của Whisper v2
  if (lang === ORIGINAL_WHISPER) {
    const base = de.find((t) => t.track.auto) ?? de[0];
    if (!base) throw new Error("Video này không có phụ đề YouTube tiếng Đức để kết hợp với Whisper.");
    if (!whisper) throw new Error("Đăng nhập để dùng Original + Whisper.");
    if (!whisperEnabled()) throw new Error("Whisper chưa được bật.");
    const yt = await base.load();
    if (!yt.length) throw new Error("Phụ đề YouTube rỗng hoặc không đọc được.");
    // Đã có Whisper v2 của video → dùng lại, khỏi tốn lượt
    const wh = germanOnly(getCached<Transcript>(`yt:${videoId}:${WHISPER_V2}`)) ?? (await runWhisper("v2"));
    const { segments, matched } = transferPunctuation(yt, wh.segments);
    if (matched < MIN_MATCH) {
      throw new Error(`Whisper nghe khác phụ đề YouTube quá nhiều (chỉ khớp ${Math.round(matched * 100)}% số từ) — không ghép được.`);
    }
    const result = { videoId, title, track: MIX_TRACK, tracks, segments };
    setCached(cacheKey, result, null);
    return result;
  }

  // Phụ đề YouTube có sẵn được ưu tiên (miễn phí, nhanh); Whisper chỉ là phương án sau
  let picked: (typeof de)[number] | undefined;
  if (!isWhisper(lang)) {
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
      (isWhisper(lang) ? "" : "Video này không có phụ đề tiếng Đức. ") + "Đăng nhập để tạo phụ đề bằng Whisper (AI).",
    );
  }
  if (!whisperEnabled()) {
    throw new Error(
      (isWhisper(lang) ? "Whisper chưa được bật." : "Video này không có phụ đề tiếng Đức.") +
        " Cấu hình Whisper (TRANSCRIBE_API_KEY hoặc TRANSCRIBE_API_URL) trong .env.local để tự tạo phụ đề.",
    );
  }
  return runWhisper(lang === WHISPER ? "v1" : lang === WHISPER_V2 ? "v2" : whisperVersion());
}

/** Phụ đề đã lưu (không gọi YouTube) — app hỏi trước khi tự lấy trên điện thoại */
export async function getSavedTranscript(videoId: string): Promise<Transcript | null> {
  await connection();
  return (
    germanOnly(getCached<Transcript>(`ytp:${videoId}:default`)) ??
    germanOnly(getCached<Transcript>(`yt:${videoId}:${defaultWhisper()}`)) ??
    germanOnly(getCached<Transcript>(`yt:${videoId}:${defaultWhisper() === WHISPER ? WHISPER_V2 : WHISPER}`))
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
  if (!title || !raw.length || raw.length > UPLOAD_MAX_SEGMENTS) return "Dữ liệu phụ đề không hợp lệ";
  // Phụ đề gửi lên được dùng chung cho mọi người (và thêm dấu câu bằng LLM) → giới hạn mỗi người
  if (!allow(`ytupload:${userId}`, UPLOADS_PER_DAY, 24 * 3600_000)) return "Bạn đã gửi quá nhiều phụ đề hôm nay";

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
    const rawWords = Array.isArray(r.words)
      ? r.words.filter((w): w is [number, string] => Number.isFinite(w?.[0]) && typeof w?.[1] === "string")
      : undefined;
    if (rawWords?.length) {
      const cleaned = cleanSegmentWords(rawWords, r.text);
      if (!cleaned.text) continue;
      segments.push({
        start: cleaned.words?.[0]?.[0] ?? r.start,
        end: r.end,
        text: cleaned.text,
        ...(cleaned.words?.length ? { words: cleaned.words } : {}),
      });
    } else {
      const text = cleanSubtitleText(r.text);
      if (!text) continue;
      segments.push({ start: r.start, end: r.end, text });
    }
  }

  if (segments.reduce((n, s) => n + s.text.length, 0) > UPLOAD_MAX_CHARS) return "Phụ đề quá dài";
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

/**
 * Lấy phụ đề của video YouTube ở BẤT KỲ ngôn ngữ nào (dùng cho thuyết minh tiếng Việt).
 * Ưu tiên: phụ đề thủ công tiếng Việt → phụ đề thủ công ngôn ngữ khác → phụ đề tự động tiếng Việt → phụ đề tự động khác.
 */
export async function fetchAnyYouTubeSubtitles(
  videoId: string,
  { maxSeconds, skipPunctuate = false }: { maxSeconds?: number; skipPunctuate?: boolean } = {},
): Promise<{ title: string; duration?: number; lang: string; auto: boolean; segments: Segment[] } | null> {
  await connection();
  const { title, duration, tracks } = await orYtdlp(
    () => fromInnertube(videoId),
    () => fromYtdlp(videoId),
  );
  if (maxSeconds && duration && duration > maxSeconds) throw new VideoTooLongError(duration, maxSeconds);
  if (!tracks.length) return null;

  const baseLang = (code?: string) => (code || "").toLowerCase().split(/[-_]/)[0];
  const origBase = baseLang(tracks.find((x) => x.track.auto)?.track.languageCode);
  const isVi = (t: Track) => baseLang(t.languageCode) === "vi";
  const isOrig = (t: Track) => Boolean(origBase) && baseLang(t.languageCode) === origBase;
  const isEnOrDe = (t: Track) => {
    const b = baseLang(t.languageCode);
    return b === "en" || b === "de";
  };
  const ordered = [
    ...new Set([
      ...tracks.filter((x) => !x.track.auto && isVi(x.track)),
      ...tracks.filter((x) => !x.track.auto && isOrig(x.track)),
      ...tracks.filter((x) => x.track.auto && isVi(x.track)),
      ...tracks.filter((x) => x.track.auto && isOrig(x.track)),
      ...tracks.filter((x) => !x.track.auto && isEnOrDe(x.track)),
      ...tracks.filter((x) => !x.track.auto),
      ...tracks.filter((x) => x.track.auto),
    ]),
  ];

  for (const cand of ordered) {
    try {
      let segments = await cand.load();
      if (segments.length) {
        if (!skipPunctuate && cand.track.auto && punctuationEnabled() && lacksPunctuation(segments)) {
          segments = await addPunctuation(segments, cand.track.languageCode);
        }
        return {
          title,
          duration,
          lang: cand.track.languageCode,
          auto: cand.track.auto,
          segments,
        };
      }
    } catch {
      // Thử track kế tiếp
    }
  }
  return null;
}

/**
 * Tạo phụ đề bằng Whisper tự nhận diện ngôn ngữ (không ép tiếng Đức) — dùng làm fallback cho tab Thuyết minh
 * khi video YouTube không có bất kỳ track phụ đề nào.
 */
export async function transcribeAnyYouTubeAudio(
  videoId: string,
  { quotaKey, maxSeconds, skipPunctuate = false }: { quotaKey?: string; maxSeconds?: number; skipPunctuate?: boolean } = {},
): Promise<{ title: string; segments: Segment[] }> {
  await connection();
  if (!whisperEnabled()) throw new Error("Whisper chưa được bật trên server.");
  if (quotaKey && !allow(`whisper:${quotaKey}`, WHISPER_PER_DAY, 24 * 3600_000)) {
    throw new Error(`Mỗi ngày chỉ tạo được ${WHISPER_PER_DAY} phụ đề bằng Whisper. Mai thử lại nhé.`);
  }
  const { title, duration, audio } = await orYtdlp(
    () => fromInnertube(videoId),
    () => fromYtdlp(videoId),
  );
  if (maxSeconds && duration && duration > maxSeconds) throw new VideoTooLongError(duration, maxSeconds);
  const { blob, filename } = await audio();
  const r = await transcribeAudio(blob, filename, 0, { version: whisperVersion(), language: null });
  let { segments } = r;
  if (!skipPunctuate && punctuationEnabled() && lacksPunctuation(segments)) {
    segments = await addPunctuation(segments, "auto");
  }
  if (!segments.length) throw new Error("Whisper không nhận dạng được lời thoại nào.");
  return { title, segments };
}
