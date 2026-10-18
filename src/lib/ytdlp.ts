import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
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
 */

const BIN = process.env.YTDLP_PATH || "yt-dlp";

/** yt-dlp chưa được cài → coi như không có phương án dự phòng */
export class YtdlpMissingError extends Error {}

function commonArgs(): string[] {
  const env = process.env;
  const args = ["--no-playlist", "--no-progress", "--no-warnings"];
  const runtimes = env.YTDLP_JS_RUNTIMES ?? "node";
  if (runtimes) args.push("--js-runtimes", runtimes);
  if (env.BGUTIL_SERVER_HOME) args.push("--extractor-args", `youtubepot-bgutilscript:server_home=${env.BGUTIL_SERVER_HOME}`);
  if (env.BGUTIL_BASE_URL) args.push("--extractor-args", `youtubepot-bgutilhttp:base_url=${env.BGUTIL_BASE_URL}`);
  if (env.YTDLP_COOKIES) args.push("--cookies", env.YTDLP_COOKIES);
  if (env.YTDLP_PROXY) args.push("--proxy", env.YTDLP_PROXY);
  return args;
}

function run(args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      BIN,
      [...commonArgs(), ...args],
      { timeout, killSignal: "SIGKILL", maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (!err) return resolve(stdout);
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          return reject(new YtdlpMissingError("yt-dlp chưa được cài trên server."));
        }
        console.error("[yt-dlp]", args.join(" "), "\n", stderr.slice(-3000));
        if (err.killed) return reject(new Error("yt-dlp: hết thời gian chờ."));
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
    await run(["--load-info-json", infoFile, "-o", path.join(dir, "out.%(ext)s"), ...args], timeout);
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
export async function ytdlpVideo(videoId: string): Promise<{ title: string; tracks: YtdlpTrack[] }> {
  const { info } = await getInfo(videoId);
  return { title: info.title ?? videoId, tracks: listTracks(info) };
}

/** Tải 1 track phụ đề bằng yt-dlp */
export async function ytdlpCaptions(videoId: string, track: { languageCode: string; auto: boolean }): Promise<Segment[]> {
  const { info } = await getInfo(videoId);
  const t = listTracks(info).find((x) => x.languageCode === track.languageCode && x.auto === track.auto);
  if (!t) throw new Error("Không tìm thấy phụ đề này.");
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
export async function ytdlpAudio(videoId: string, maxBytes: number): Promise<{ blob: Blob; filename: string }> {
  const file = await runOnInfo(
    videoId,
    ["-f", "139/249/worstaudio[vcodec=none]/worstaudio", "--max-filesize", String(maxBytes)],
    300_000,
  );
  // --max-filesize: file quá lớn thì yt-dlp bỏ qua, không báo lỗi
  if (!file) throw new Error("Video quá dài để tạo phụ đề bằng Whisper (tối đa khoảng 1 giờ).");
  const webm = file.name.endsWith(".webm");
  return {
    blob: new Blob([new Uint8Array(file.data)], { type: webm ? "audio/webm" : "audio/mp4" }),
    filename: webm ? "audio.webm" : "audio.m4a",
  };
}
