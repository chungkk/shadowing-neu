import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseSubtitleFile, parseYouTubeXml, type Segment } from "./subtitles";

/**
 * Phương án dự phòng khi IP server bị YouTube chặn ("Melde dich an, damit wir sehen, dass du kein Bot bist"):
 * gọi yt-dlp (+ plugin bgutil tạo PO token). Xem docs/youtube-audio-download.md, Bước 3A.
 *
 * Biến môi trường (đều không bắt buộc):
 * - YTDLP_PATH          đường dẫn yt-dlp (mặc định "yt-dlp" trong PATH)
 * - YTDLP_JS_RUNTIMES   JS runtime cho yt-dlp (mặc định "node"; để trống = dùng mặc định của yt-dlp)
 * - BGUTIL_SERVER_HOME  thư mục server/ của bgutil-ytdlp-pot-provider (chế độ script)
 * - BGUTIL_BASE_URL     URL server HTTP của bgutil (chế độ HTTP, vd. http://bgutil:4416)
 * - YTDLP_COOKIES       file cookies.txt (Netscape) của tài khoản YouTube, khi PO token vẫn chưa đủ
 * - YTDLP_PROXY         proxy cho yt-dlp (vd. socks5://user:pass@host:1080)
 * - YTDLP_AUTO_UPDATE   "0" = tắt tự nâng cấp yt-dlp (mặc định bật, xem phần "Tự nâng cấp" bên dưới)
 */

const BIN = process.env.YTDLP_PATH || "yt-dlp";

/** yt-dlp chưa được cài → coi như không có phương án dự phòng */
export class YtdlpMissingError extends Error {}

function commonArgs(): string[] {
  const env = process.env;
  const args = ["--no-playlist", "--no-progress", "--no-warnings"];
  const runtimes = env.YTDLP_JS_RUNTIMES ?? "node";
  if (runtimes) args.push("--js-runtimes", runtimes);
  // Chỉ dùng khi bgutil đã được build (image Docker có thể bỏ qua bgutil nếu lúc build không vào được GitHub)
  if (env.BGUTIL_SERVER_HOME && existsSync(path.join(env.BGUTIL_SERVER_HOME, "build")))
    args.push("--extractor-args", `youtubepot-bgutilscript:server_home=${env.BGUTIL_SERVER_HOME}`);
  if (env.BGUTIL_BASE_URL) args.push("--extractor-args", `youtubepot-bgutilhttp:base_url=${env.BGUTIL_BASE_URL}`);
  if (env.YTDLP_COOKIES) args.push("--cookies", env.YTDLP_COOKIES);
  if (env.YTDLP_PROXY) args.push("--proxy", env.YTDLP_PROXY);
  return args;
}

// ---- Tự nâng cấp ----
// YouTube đổi cơ chế liên tục, yt-dlp cũ vài tháng là hỏng (vd. "HTTP Error 403: Forbidden").
// → Mỗi 24 giờ nâng cấp ngầm 1 lần; lệnh yt-dlp bị lỗi thì nâng cấp ngay (tối đa 1 lần/giờ) rồi thử lại.
// yt-dlp cài bằng pip trong venv (image Docker) → pip install -U; cài bằng Homebrew (máy Mac) → brew upgrade.

const UPDATE_EVERY = 24 * 60 * 60_000;
const UPDATE_ON_ERROR_GAP = 60 * 60_000;
let lastUpdate = 0;
let updating: Promise<boolean> | null = null;

function exec(cmd: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(/*turbopackIgnore: true*/ cmd, args, { timeout, killSignal: "SIGKILL" }, (err, stdout, stderr) =>
      err ? reject(new Error(stderr.slice(-2000) || err.message)) : resolve(stdout.trim()),
    ),
  );
}

async function findBin(): Promise<string | null> {
  const dirs = BIN.includes("/") ? [""] : (process.env.PATH ?? "").split(path.delimiter);
  for (const d of dirs) {
    const p = d ? path.join(d, BIN) : BIN;
    if (existsSync(p)) return realpath(p);
  }
  return null;
}

async function updateCommand(): Promise<[string, string[]] | null> {
  const bin = await findBin();
  if (!bin) return null;
  if (bin.includes("/Cellar/")) return ["brew", ["upgrade", "yt-dlp"]];
  // Script do pip tạo: dòng đầu là "#!<python của venv>"
  const python = (await readFile(bin, "utf8").catch(() => "")).match(/^#!(\S+python[\d.]*)/)?.[1];
  if (python && existsSync(path.join(path.dirname(python), "pip")))
    return [python, ["-m", "pip", "install", "--no-cache-dir", "--disable-pip-version-check", "-U", "yt-dlp[default]"]];
  return null;
}

/** Nâng yt-dlp lên bản mới nhất. Trả về true nếu bản đã thay đổi. */
function updateYtdlp(minGap: number): Promise<boolean> {
  if (updating) return updating;
  if (process.env.YTDLP_AUTO_UPDATE === "0" || Date.now() - lastUpdate < minGap) return Promise.resolve(false);
  lastUpdate = Date.now();
  updating = (async () => {
    try {
      const cmd = await updateCommand();
      if (!cmd) return false;
      const before = await exec(BIN, ["--version"], 30_000);
      await exec(cmd[0], cmd[1], 300_000);
      const after = await exec(BIN, ["--version"], 30_000);
      if (after !== before) {
        console.log(`[yt-dlp] đã nâng cấp ${before} → ${after}`);
        infoCache.clear();
        return true;
      }
      return false;
    } catch (e) {
      console.error("[yt-dlp] nâng cấp lỗi:", (e as Error).message);
      return false;
    } finally {
      updating = null;
    }
  })();
  return updating;
}

/** Chạy fn; lỗi (không phải do thiếu yt-dlp / hết giờ) → nâng cấp yt-dlp, có bản mới thì thử lại 1 lần */
async function withUpdate<T>(fn: () => Promise<T>): Promise<T> {
  if (updating) await updating;
  else void updateYtdlp(UPDATE_EVERY);
  try {
    return await fn();
  } catch (e) {
    if (e instanceof YtdlpMissingError || e instanceof YtdlpTimeoutError || e instanceof YtdlpUserError) throw e;
    if (!(await updateYtdlp(UPDATE_ON_ERROR_GAP))) throw e;
    return fn();
  }
}

class YtdlpTimeoutError extends Error {}
/** Lỗi không phải do yt-dlp cũ (video quá dài, không có phụ đề…) → nâng cấp cũng vô ích */
class YtdlpUserError extends Error {}

function run(args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // turbopackIgnore: yt-dlp là chương trình hệ thống, không phải file trong dự án → không để Next chép cả dự án vào bản build
    execFile(
      /*turbopackIgnore: true*/
      BIN,
      [...commonArgs(), ...args],
      { timeout, killSignal: "SIGKILL", maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (!err) return resolve(stdout);
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          return reject(new YtdlpMissingError("yt-dlp chưa được cài trên server."));
        }
        console.error("[yt-dlp]", args.join(" "), "\n", stderr.slice(-3000));
        if (err.killed) return reject(new YtdlpTimeoutError("yt-dlp: hết thời gian chờ."));
        const line = stderr
          .split("\n")
          .reverse()
          .find((l) => l.startsWith("ERROR:"));
        const msg = line?.replace(/^ERROR:\s*(\[youtube\]\s*[\w-]+:\s*)?/, "").trim();
        reject(new Error(msg ? `YouTube (yt-dlp): ${msg}` : "yt-dlp bị lỗi."));
      },
    );
  });
}

type SubFormat = { ext: string; url?: string; name?: string };
type Info = {
  title?: string;
  duration?: number;
  subtitles?: Record<string, SubFormat[]>;
  automatic_captions?: Record<string, SubFormat[]>;
};

// Kết quả `yt-dlp -J` dùng lại 30 phút (link media hết hạn sau ~6 giờ), khỏi chạy lại PO token
const INFO_TTL = 30 * 60_000;
const infoCache = new Map<string, { json: string; info: Info; exp: number }>();

async function getInfo(videoId: string) {
  const now = Date.now();
  for (const [k, v] of infoCache) if (v.exp <= now) infoCache.delete(k);
  const hit = infoCache.get(videoId);
  if (hit) return hit;
  const json = await run(["-J", "--skip-download", `https://www.youtube.com/watch?v=${videoId}`], 120_000);
  const entry = { json, info: JSON.parse(json) as Info, exp: now + INFO_TTL };
  infoCache.set(videoId, entry);
  return entry;
}

/** Chạy yt-dlp trên info JSON đã có (không phải gọi YouTube lấy thông tin lại), trả về file kết quả. */
async function runOnInfo(videoId: string, args: string[], timeout: number) {
  const { json } = await getInfo(videoId);
  const dir = await mkdtemp(path.join(tmpdir(), `ytdlp-${videoId}-`));
  try {
    const infoFile = path.join(dir, "info.json");
    await writeFile(infoFile, json);
    try {
      await run(["--load-info-json", infoFile, "-o", path.join(dir, "out.%(ext)s"), ...args], timeout);
    } catch (e) {
      // Link media / PO token trong info JSON có thể đã hỏng (vd. 403) → lần thử sau lấy info mới
      infoCache.delete(videoId);
      throw e;
    }
    const name = (await readdir(dir)).find((f) => f.startsWith("out.") && !f.endsWith(".part"));
    if (!name) return null;
    return { name, data: await readFile(path.join(dir, name)) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export type YtdlpTrack = { languageCode: string; name: string; auto: boolean; key: string };

function listTracks(info: Info): YtdlpTrack[] {
  const manual = Object.entries(info.subtitles ?? {})
    .filter(([key]) => key !== "live_chat")
    .map(([key, f]) => ({ key, languageCode: key, name: f[0]?.name ?? key, auto: false }));
  // automatic_captions gồm cả bản dịch máy sang mọi ngôn ngữ (link có `tlang=`) → chỉ giữ bản gốc
  const auto: YtdlpTrack[] = [];
  const entries = Object.entries(info.automatic_captions ?? {})
    .filter(([, f]) => f.some((x) => x.url && !/[?&]tlang=/.test(x.url)))
    .sort(([a], [b]) => Number(b.endsWith("-orig")) - Number(a.endsWith("-orig")));
  for (const [key, f] of entries) {
    const languageCode = key.replace(/-orig$/, "");
    if (!auto.some((t) => t.languageCode === languageCode)) {
      auto.push({ key, languageCode, name: f[0]?.name ?? languageCode, auto: true });
    }
  }
  return [...manual, ...auto];
}

/** Tiêu đề + danh sách phụ đề của video, lấy bằng yt-dlp */
export async function ytdlpVideo(videoId: string): Promise<{ title: string; duration?: number; tracks: YtdlpTrack[] }> {
  const { info } = await withUpdate(() => getInfo(videoId));
  return { title: info.title ?? videoId, duration: info.duration, tracks: listTracks(info) };
}

/** Tải 1 track phụ đề bằng yt-dlp */
export function ytdlpCaptions(videoId: string, track: { languageCode: string; auto: boolean }): Promise<Segment[]> {
  return withUpdate(() => captions(videoId, track));
}

async function captions(videoId: string, track: { languageCode: string; auto: boolean }): Promise<Segment[]> {
  const { info } = await getInfo(videoId);
  const t = listTracks(info).find((x) => x.languageCode === track.languageCode && x.auto === track.auto);
  if (!t) throw new YtdlpUserError("Không tìm thấy phụ đề này.");
  const file = await runOnInfo(
    videoId,
    [
      "--skip-download",
      t.auto ? "--write-auto-subs" : "--write-subs",
      "--sub-langs",
      `^${t.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "--sub-format",
      "srv1/srv3/vtt/best",
    ],
    90_000,
  );
  if (!file) throw new Error("Không tải được phụ đề (yt-dlp).");
  const text = file.data.toString("utf8");
  return file.name.endsWith(".vtt") ? parseSubtitleFile(text) : parseYouTubeXml(text);
}

/** Tải audio nhỏ nhất bằng yt-dlp (có PO token nên tải được trọn file) */
export function ytdlpAudio(videoId: string, maxBytes: number): Promise<{ blob: Blob; filename: string }> {
  return withUpdate(() => audio(videoId, maxBytes));
}

async function audio(videoId: string, maxBytes: number): Promise<{ blob: Blob; filename: string }> {
  const file = await runOnInfo(
    videoId,
    ["-f", "139/249/worstaudio[vcodec=none]/worstaudio", "--max-filesize", String(maxBytes)],
    300_000,
  );
  // --max-filesize: file quá lớn thì yt-dlp bỏ qua, không báo lỗi
  if (!file) throw new YtdlpUserError("Video quá dài để tạo phụ đề bằng Whisper (tối đa khoảng 1 giờ).");
  const webm = file.name.endsWith(".webm");
  return {
    blob: new Blob([new Uint8Array(file.data)], { type: webm ? "audio/webm" : "audio/mp4" }),
    filename: webm ? "audio.webm" : "audio.m4a",
  };
}

// ---- Kênh YouTube (trang admin "Kênh") ----

export type ChannelVideo = { id: string; title: string; duration: number | null };
export type ChannelListing = { channelId: string; title: string; handle: string; avatar: string; videos: ChannelVideo[] };

/**
 * Link / @handle / mã kênh → URL tab "Video" của kênh. Không nhận ra → null.
 * Nhận: "@EasyGerman", "UCbxb2…", "https://www.youtube.com/@x/featured", "…/channel/UC…", "…/c/x", "…/user/x"
 */
export function channelVideosUrl(input: string): string | null {
  const s = input.trim();
  if (/^@[\w.-]{2,}$/.test(s)) return `https://www.youtube.com/${s}/videos`;
  if (/^UC[\w-]{22}$/.test(s)) return `https://www.youtube.com/channel/${s}/videos`;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/i.test(u.hostname)) return null;
  const m = u.pathname.match(/^\/(@[^/]+|channel\/UC[\w-]{22}|c\/[^/]+|user\/[^/]+)/);
  return m ? `https://www.youtube.com/${m[1]}/videos` : null;
}

// Danh sách video của kênh dùng lại 15 phút (mở lại trang kênh không phải gọi YouTube)
const CHANNEL_TTL = 15 * 60_000;
const channelCache = new Map<string, { data: ChannelListing; exp: number }>();

/** Thông tin kênh + `limit` video mới nhất (tab "Video", không gồm Shorts / livestream) */
export async function ytdlpChannel(url: string, limit: number, { fresh = false } = {}): Promise<ChannelListing> {
  const key = `${url}|${limit}`;
  const now = Date.now();
  for (const [k, v] of channelCache) if (v.exp <= now) channelCache.delete(k);
  const hit = channelCache.get(key);
  if (hit && !fresh) return hit.data;
  const json = await withUpdate(() => run(["--flat-playlist", "-J", "--playlist-end", String(limit), url], 90_000));
  const d = JSON.parse(json) as {
    channel_id?: string;
    id?: string;
    channel?: string;
    uploader?: string;
    uploader_id?: string;
    thumbnails?: { url: string; id?: string }[];
    entries?: { id?: string; title?: string; duration?: number | null }[];
  };
  const channelId = d.channel_id ?? d.id ?? "";
  if (!/^UC[\w-]{22}$/.test(channelId)) throw new Error("Không đọc được thông tin kênh.");
  const thumbs = d.thumbnails ?? [];
  const data: ChannelListing = {
    channelId,
    title: d.channel ?? d.uploader ?? channelId,
    handle: d.uploader_id?.startsWith("@") ? d.uploader_id : "",
    avatar: (thumbs.find((t) => t.id === "avatar_uncropped") ?? thumbs.find((t) => /yt3\./.test(t.url)))?.url ?? "",
    videos: (d.entries ?? [])
      .filter((e): e is { id: string; title?: string; duration?: number | null } => !!e.id && /^[\w-]{11}$/.test(e.id))
      .map((e) => ({ id: e.id, title: e.title ?? e.id, duration: e.duration ?? null })),
  };
  channelCache.set(key, { data, exp: now + CHANNEL_TTL });
  return data;
}
