#!/usr/bin/env node
/**
 * Kiểm tra client Innertube nào còn tải được TRỌN audio của video YouTube (dùng cho Whisper).
 * Xem hướng dẫn: docs/youtube-audio-download.md
 *
 *   node scripts/probe-youtube-audio.mjs [videoId]                # thử các client có sẵn bên dưới
 *   node scripts/probe-youtube-audio.mjs [videoId] --client '{"clientName":"X","clientVersion":"1.0","userAgent":"..."}'
 *
 * Mặc định videoId = RbtIMGCizu0 (Easy German, ~15 phút, audio ~5.7MB).
 * Kết quả "FULL OK" = client đó tải được cả khúc giữa + khúc cuối file → dùng được cho video dài.
 */

const args = process.argv.slice(2);
const videoId = args.find((a) => !a.startsWith("--") && !a.startsWith("{")) ?? "RbtIMGCizu0";
const customIdx = args.indexOf("--client");
const custom = customIdx >= 0 ? JSON.parse(args[customIdx + 1]) : null;

// Giữ đồng bộ với VISIONOS_CLIENT trong src/lib/youtube.ts. Thêm client mới lấy từ
// yt-dlp: yt_dlp/extractor/youtube/_base.py → INNERTUBE_CLIENTS
const SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const CLIENTS = custom
  ? { CUSTOM: { needsVisitor: true, clientNameId: custom.clientNameId, ctx: custom } }
  : {
      VISIONOS: {
        needsVisitor: true,
        clientNameId: 101,
        ctx: {
          clientName: "VISIONOS",
          clientVersion: "1.02",
          deviceMake: "Apple",
          deviceModel: "RealityDevice17,1",
          userAgent: SAFARI_UA,
          osName: "visionOS",
          osVersion: "26.5.23O471",
        },
      },
      ANDROID: {
        needsVisitor: false,
        clientNameId: 3,
        ctx: {
          clientName: "ANDROID",
          clientVersion: "20.10.38",
          androidSdkVersion: 34,
          userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
        },
      },
      IOS: {
        needsVisitor: true,
        clientNameId: 5,
        ctx: {
          clientName: "IOS",
          clientVersion: "20.10.4",
          deviceMake: "Apple",
          deviceModel: "iPhone16,2",
          osName: "iPhone",
          osVersion: "18.3.2.22D82",
          userAgent: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
        },
      },
    };

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s]`, ...a);

async function timed(url, ua, ms = 15_000) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(ms) });
    await r.arrayBuffer();
    return r.status;
  } catch {
    return "timeout";
  }
}

let visitorData;
async function getVisitor() {
  if (visitorData !== undefined) return visitorData;
  const html = await (
    await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=de`, { headers: { "User-Agent": SAFARI_UA } })
  ).text();
  visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1] ?? null;
  log("visitorData:", visitorData ? visitorData.slice(0, 16) + "…" : "KHÔNG TÌM THẤY");
  return visitorData;
}

const summary = [];
for (const [name, c] of Object.entries(CLIENTS)) {
  console.log(`\n=== ${name} ===`);
  const ua = c.ctx.userAgent ?? SAFARI_UA;
  const vd = c.needsVisitor ? await getVisitor() : undefined;
  const headers = { "Content-Type": "application/json", "User-Agent": ua };
  if (c.clientNameId) headers["X-YouTube-Client-Name"] = String(c.clientNameId);
  headers["X-YouTube-Client-Version"] = c.ctx.clientVersion;
  if (vd) headers["X-Goog-Visitor-Id"] = vd;

  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers,
    body: JSON.stringify({ context: { client: { ...c.ctx, hl: "de", ...(vd ? { visitorData: vd } : {}) } }, videoId }),
  });
  const p = await res.json().catch(() => ({}));
  const status = p.playabilityStatus?.status;
  log("player:", res.status, status, p.playabilityStatus?.reason ?? "");
  if (status !== "OK") {
    summary.push([name, `player ${status ?? res.status}`]);
    continue;
  }
  const audio = (p.streamingData?.adaptiveFormats ?? []).filter((f) => f.mimeType.startsWith("audio/"));
  log("audio:", audio.map((f) => `${f.itag}${f.isDrc ? "drc" : ""}:${f.url ? "url" : "cipher"}`).join(" ") || "không có");
  const f = audio.find((f) => f.url && !f.isDrc && f.itag === 139) ?? audio.find((f) => f.url && !f.isDrc);
  if (!f) {
    summary.push([name, audio.length ? "chỉ có signatureCipher (cần giải mã JS player)" : "không có audio"]);
    continue;
  }
  const size = Number(f.contentLength);
  const points = [0, 2_000_000, Math.floor(size / 2), size - 1024].filter((x) => x >= 0 && x < size);
  const results = [];
  for (const at of points) {
    const st = await timed(`${f.url}&range=${at}-${Math.min(at + 1023, size - 1)}`, ua);
    log(`itag ${f.itag} @${at}: ${st}`);
    results.push(st);
  }
  const ok = results.every((s) => s === 200);
  const firstOnly = results[0] === 200 && !ok;
  summary.push([name, ok ? "FULL OK ✅" : firstOnly ? "chỉ ~1MB đầu (≈3 phút) ⚠️" : `lỗi ${results.join(",")} ❌`]);
}

console.log("\n=== KẾT QUẢ ===");
for (const [n, r] of summary) console.log(`${n.padEnd(10)} ${r}`);
