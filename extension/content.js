(() => {
  if (window.__hvnDubLoaded) return;
  window.__hvnDubLoaded = true;

  const DEFAULT_SETTINGS = {
    apiBase: "https://hallovn.de",
    voiceId: "edge:vi-VN-NamMinhNeural",
    speed: 1.15,
    origVol: 25,
    dubVol: 115,
    showCaptions: true,
    showOrig: false,
    autoNextYouTube: false,
  };

  const MAX_FIT_SPEED = 1.45;
  const MAX_BUF_CACHE = 48;
  const MAX_QUEUE_LAG_SEC = 2.2;
  const EDGE_MAX_CHARS = 600;
  const BG_RECONNECT_DELAYS_MS = [2000, 3500, 5000];

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    enabled: false,
    loading: false,
    loadingPct: 0,
    loadingTarget: 34,
    loadingStartedAt: 0,
    bgProgress: null,
    error: "",
    sourceMode: null, // "youtube" | "web" | "custom"
    sourceKey: "",
    title: "",
    cues: [],
    activeCueIdx: -1,
    video: null,
    savedOrigVol: null,
    savedMuted: null,
    // Web Audio
    ctx: null,
    gain: null,
    audioBlocked: false,
    activeSrcs: new Set(),
    scheduled: [],
    playback: null,
    audioEndAt: 0,
    stopGen: 0,
    bufCache: new Map(),
    inflightTts: new Map(),
    lastSpokenIdx: -1,
    lastVideoTime: 0,
    lastPollWall: 0,
    // Stream port
    port: null,
    streamRunId: 0,
    // DOM elements
    hudEl: null,
    ytBtnEl: null,
    // Cleanup hooks for current video element
    videoListenersCleanup: null,
    lastUrl: location.href,
  };

  // ---------------- Utilities ----------------

  function isYouTubeHost() {
    const h = location.hostname.toLowerCase();
    return h === "youtube.com" || h.endsWith(".youtube.com") || h === "youtu.be";
  }

  function getYouTubeVideoId() {
    if (!isYouTubeHost()) return null;
    try {
      const u = new URL(location.href);
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  function findBestVideo() {
    const videos = Array.from(document.querySelectorAll("video"));
    if (!videos.length) return null;
    // Ưu tiên video chính trên YouTube
    if (isYouTubeHost()) {
      const main = document.querySelector("video.html5-main-video");
      if (main) return main;
    }
    // Chọn video đang phát hoặc có diện tích hiển thị lớn nhất
    let best = null;
    let bestScore = -1;
    for (const v of videos) {
      const rect = v.getBoundingClientRect();
      const area = rect.width * rect.height;
      const playingBonus = !v.paused && v.readyState >= 2 ? 1_000_000 : 0;
      const score = area + playingBonus;
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  }

  function estimateViDurSec(text, speed) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const pauses = (text.match(/[,;:.!?…]/g) || []).length;
    return (words * 0.24 + pauses * 0.12 + 0.15) / Math.max(0.75, speed);
  }

  function truncateTtsText(text, maxChars) {
    const clean = text.trim();
    if (clean.length <= maxChars) return clean;
    const cut = clean.slice(0, maxChars);
    const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","), cut.lastIndexOf("."));
    return (lastBreak > maxChars * 0.6 ? cut.slice(0, lastBreak) : cut).trim();
  }

  function base64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function parseTimestampMs(ts) {
    const m = ts.trim().match(/(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})/);
    if (!m) return null;
    const frac = Number((m[4] + "000").slice(0, 3));
    return ((Number(m[1] || 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + frac;
  }

  function parseSubtitleText(raw) {
    const text = String(raw || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/^\ufeff/, "");
    const cues = [];
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const ti = lines.findIndex((l) => l.includes("-->"));
      if (ti === -1) continue;
      const [left, right] = lines[ti].split("-->");
      const start = parseTimestampMs(left || "");
      const end = parseTimestampMs(right || "");
      if (start === null || end === null) continue;
      const cleaned = lines
        .slice(ti + 1)
        .join(" ")
        .replace(/<[^>]+>|\{[^}]*\}/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned || /^[.\-–—♪♫\s]+$/.test(cleaned)) continue;
      cues.push({ start_ms: start, end_ms: Math.max(end, start + 150), text: cleaned });
    }
    return cues.sort((a, b) => a.start_ms - b.start_ms);
  }

  function smartLoadingLabel(pct, elapsedSec) {
    if (pct < 32) return "Đang chuẩn bị thuyết minh…";
    if (pct < 68) return "Đang tạo giọng tiếng Việt…";
    if (elapsedSec >= 12) return "Video khá dài, sắp sẵn sàng…";
    return "Đang đồng bộ giọng đọc…";
  }

  function smartTargetPct(serverPct) {
    if (serverPct >= 95) return 96;
    if (serverPct >= 40) return Math.min(94, Math.max(serverPct + 18, 76));
    if (serverPct >= 28) return 72;
    if (serverPct >= 14) return 54;
    return 34;
  }

  // ---------------- Web Audio Engine ----------------

  function getAudioCtx() {
    if (!state.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = Math.min(1.8, Math.max(0, state.settings.dubVol / 100));
      gain.connect(ctx.destination);
      ctx.onstatechange = () => {
        const running = ctx.state === "running";
        state.audioBlocked = !running;
        if (running && state.activeSrcs.size === 0 && state.playback?.pausedOffset == null) {
          state.lastSpokenIdx = -1;
        }
        renderHud();
      };
      state.ctx = ctx;
      state.gain = gain;
    }
    if (state.ctx.state === "suspended") {
      state.audioBlocked = true;
      state.ctx
        .resume()
        .then(() => {
          if (state.ctx) state.audioBlocked = state.ctx.state !== "running";
          renderHud();
        })
        .catch(() => {
          state.audioBlocked = true;
          renderHud();
        });
    } else if (state.ctx.state === "running") {
      state.audioBlocked = false;
    }
    return state.ctx;
  }

  function stopActiveSources() {
    state.stopGen += 1;
    for (const src of state.activeSrcs) {
      try {
        src.stop();
      } catch {}
      try {
        src.disconnect();
      } catch {}
    }
    state.activeSrcs.clear();
    state.scheduled = [];
    state.audioEndAt = 0;
  }

  function stopSpeech() {
    state.playback = null;
    stopActiveSources();
  }

  function pauseSpeech() {
    const ctx = state.ctx;
    const queue = state.scheduled;
    if (ctx && queue.length > 0) {
      const now = ctx.currentTime;
      let target = null;
      let savedOffset = 0;
      for (const item of queue) {
        const endAt = item.startedAtCtx + (item.buf.duration - item.baseOffset);
        if (now >= item.startedAtCtx && now < endAt - 0.15) {
          target = item;
          savedOffset = item.baseOffset + (now - item.startedAtCtx);
          break;
        }
      }
      if (!target) {
        const upcoming = queue.find((item) => item.startedAtCtx > now);
        if (upcoming) {
          target = upcoming;
          savedOffset = upcoming.baseOffset;
        }
      }
      if (target && savedOffset < target.buf.duration - 0.15) {
        state.playback = { ...target, pausedOffset: savedOffset };
      } else {
        state.playback = null;
      }
    } else if (state.playback && state.playback.pausedOffset === null) {
      state.playback = null;
    }
    stopActiveSources();
  }

  function putBufCache(key, buf) {
    if (state.bufCache.has(key)) state.bufCache.delete(key);
    state.bufCache.set(key, buf);
    while (state.bufCache.size > MAX_BUF_CACHE) {
      const oldest = state.bufCache.keys().next().value;
      if (oldest !== undefined) state.bufCache.delete(oldest);
      else break;
    }
  }

  async function fetchTtsBuffer(text, voiceId, speed) {
    const res = await chrome.runtime.sendMessage({
      type: "hvn:tts",
      text: truncateTtsText(text, EDGE_MAX_CHARS),
      voiceId,
      speed,
    });
    if (!res?.ok || !res.base64) {
      throw new Error(res?.error || "Không tạo được giọng đọc.");
    }
    const ab = base64ToArrayBuffer(res.base64);
    return getAudioCtx().decodeAudioData(ab);
  }

  async function getCueBuffer(cueIndex, vId, spd) {
    const cue = state.cues[cueIndex];
    if (!cue || cue.pending || !cue.text?.trim()) return null;

    const normSpd = Math.round(spd * 20) / 20;
    const rate = Math.round(((state.video && state.video.playbackRate) || 1) * 20) / 20;
    const key = `${vId}:${normSpd.toFixed(2)}:${rate.toFixed(2)}:${cueIndex}`;
    const hit = state.bufCache.get(key);
    if (hit) {
      putBufCache(key, hit);
      return hit;
    }
    const existing = state.inflightTts.get(key);
    if (existing) return existing;

    const p = (async () => {
      try {
        const next = state.cues[cueIndex + 1];
        const slot = next ? (next.start_ms - cue.start_ms) / 1000 / rate - 0.1 : 0;

        let firstSpd = normSpd;
        if (slot > 0.4 && normSpd < MAX_FIT_SPEED) {
          const estDur = estimateViDurSec(cue.text, normSpd);
          if (estDur > slot + 0.15) {
            firstSpd = Math.min(MAX_FIT_SPEED, Math.ceil(((normSpd * estDur) / slot) * 20) / 20);
          }
        }

        let buf = await fetchTtsBuffer(cue.text, vId, firstSpd);
        if (buf && slot > 0.4 && buf.duration > slot + 0.25 && firstSpd < MAX_FIT_SPEED) {
          const need = Math.min(MAX_FIT_SPEED, Math.ceil(((firstSpd * buf.duration) / slot) * 20) / 20);
          if (need > firstSpd) {
            const fitted = await fetchTtsBuffer(cue.text, vId, need).catch(() => null);
            if (fitted) buf = fitted;
          }
        }
        if (buf) {
          putBufCache(key, buf);
          if (state.error) {
            state.error = "";
            renderHud();
          }
        }
        return buf;
      } catch (e) {
        state.error = e?.message || "Lỗi tải âm thanh thuyết minh.";
        renderHud();
        return null;
      } finally {
        state.inflightTts.delete(key);
      }
    })();

    state.inflightTts.set(key, p);
    return p;
  }

  function resumeSpeech() {
    const ctx = getAudioCtx();
    const gain = state.gain;
    const pb = state.playback;
    if (!gain || !pb || pb.pausedOffset === null || !state.video) return;

    const { voiceId: vId, speed: spd } = state.settings;
    const cue = state.cues[pb.cueIndex];
    const tMs = state.video.currentTime * 1000;
    const nextStart = state.cues[pb.cueIndex + 1]?.start_ms ?? (cue ? cue.end_ms + 5000 : 0);
    const stillInCue =
      cue && pb.voiceId === vId && tMs >= cue.start_ms - 400 && tMs < Math.min(nextStart - 60, cue.end_ms + 800);

    if (!stillInCue) {
      state.playback = null;
      return;
    }

    const offset = pb.pausedOffset;
    const remaining = pb.buf.duration - offset;
    if (remaining <= 0.12) {
      state.playback = null;
      return;
    }

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = pb.buf;
    src.connect(gain);
    src.start(now, offset);
    state.activeSrcs.add(src);
    pb.startedAtCtx = now;
    pb.baseOffset = offset;
    pb.pausedOffset = null;
    state.scheduled.push(pb);
    state.audioEndAt = now + remaining;
    src.onended = () => {
      state.activeSrcs.delete(src);
      state.scheduled = state.scheduled.filter((item) => item !== pb);
      if (state.playback === pb && pb.pausedOffset === null) {
        state.playback = state.scheduled[0] || null;
      }
    };

    for (let k = pb.cueIndex + 1; k <= Math.min(state.cues.length - 1, pb.cueIndex + 4); k++) {
      void getCueBuffer(k, vId, spd);
    }
  }

  async function speakCue(cueIndex, isSeek) {
    const video = state.video;
    if (!state.enabled || !video || video.paused || video.ended) return;
    const { voiceId: vId, speed: spd } = state.settings;
    const myStopGen = state.stopGen;

    for (let k = cueIndex + 1; k <= Math.min(state.cues.length - 1, cueIndex + 4); k++) {
      void getCueBuffer(k, vId, spd);
    }

    const buf = await getCueBuffer(cueIndex, vId, spd);
    if (!buf) return;

    if (myStopGen !== state.stopGen || !state.enabled || !state.video || state.video.paused || state.video.ended) {
      if (state.lastSpokenIdx === cueIndex && state.playback?.cueIndex !== cueIndex) {
        state.lastSpokenIdx = cueIndex - 1;
      }
      return;
    }
    if (state.lastSpokenIdx !== cueIndex || state.settings.voiceId !== vId) return;

    const ctx = getAudioCtx();
    const gain = state.gain;
    if (!gain) return;
    if (ctx.state !== "running") {
      stopActiveSources();
      return;
    }

    if (isSeek) {
      stopSpeech();
    } else if (state.audioEndAt - ctx.currentTime > MAX_QUEUE_LAG_SEC) {
      stopActiveSources();
    }

    const now = ctx.currentTime;
    const startAt = Math.max(now, state.audioEndAt + 0.02);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start(startAt);
    state.activeSrcs.add(src);

    const pb = {
      cueIndex,
      buf,
      startedAtCtx: startAt,
      baseOffset: 0,
      voiceId: vId,
      pausedOffset: null,
    };
    state.scheduled.push(pb);
    if (state.scheduled.length === 1) state.playback = pb;
    state.audioEndAt = startAt + buf.duration;

    src.onended = () => {
      state.activeSrcs.delete(src);
      state.scheduled = state.scheduled.filter((item) => item !== pb);
      if (state.playback === pb && pb.pausedOffset === null) {
        state.playback = state.scheduled[0] || null;
      }
    };
  }

  function applyVolumes() {
    if (state.gain) {
      state.gain.gain.value = state.enabled ? Math.min(1.8, Math.max(0, state.settings.dubVol / 100)) : 0;
    }
    if (state.video && state.enabled) {
      const targetVol = Math.min(1, Math.max(0, state.settings.origVol / 100));
      if (targetVol <= 0) {
        state.video.muted = true;
      } else {
        state.video.muted = false;
        state.video.volume = targetVol;
      }
    }
  }

  function attachVideo(video) {
    if (state.video === video && state.videoListenersCleanup) return;
    detachVideo();
    state.video = video;
    state.savedOrigVol = video.volume;
    state.savedMuted = video.muted;

    const onPlay = () => {
      state.lastPollWall = 0;
      applyVolumes();
      resumeSpeech();
    };
    const onPause = () => {
      state.lastPollWall = 0;
      pauseSpeech();
    };
    const onWaiting = () => {
      pauseSpeech();
    };
    const onSeeked = () => {
      stopSpeech();
      state.lastSpokenIdx = -1;
      state.lastVideoTime = video.currentTime;
      state.lastPollWall = 0;
    };
    const onEnded = () => {
      stopSpeech();
    };
    const onRateChange = () => {
      state.bufCache.clear();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ended", onEnded);
    video.addEventListener("ratechange", onRateChange);

    state.videoListenersCleanup = () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("ratechange", onRateChange);
    };

    applyVolumes();
  }

  function detachVideo() {
    if (state.videoListenersCleanup) {
      state.videoListenersCleanup();
      state.videoListenersCleanup = null;
    }
    if (state.video && state.savedOrigVol !== null) {
      try {
        state.video.volume = state.savedOrigVol;
        state.video.muted = Boolean(state.savedMuted);
      } catch {}
    }
    state.savedOrigVol = null;
    state.savedMuted = null;
    state.video = null;
  }

  // ---------------- Subtitle Extraction (YouTube Browser-side + Non-YouTube <video>) ----------------

  function decodeHtmlEntities(s) {
    return String(s || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  }

  function cleanCaptionText(s) {
    return decodeHtmlEntities(String(s || "").replace(/<[^>]+>/g, ""))
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractJsonObjectAfter(html, markerRe) {
    const m = markerRe.exec(html);
    if (!m) return null;
    const start = html.indexOf("{", m.index + m[0].length - 1);
    if (start === -1) return null;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }

  function parseYouTubeJson3(json) {
    const events = Array.isArray(json?.events) ? json.events : [];
    const cues = [];
    for (const ev of events) {
      if (!Array.isArray(ev?.segs) || typeof ev.tStartMs !== "number") continue;
      const startMs = Math.max(0, Math.round(ev.tStartMs));
      const endMs = startMs + Math.max(200, Math.round(ev.dDurationMs || 3000));
      const words = [];
      let combined = "";
      for (const seg of ev.segs) {
        const raw = typeof seg?.utf8 === "string" ? seg.utf8 : "";
        if (!raw || raw === "\n") continue;
        combined += raw;
        const w = cleanCaptionText(raw);
        if (w) {
          const wStartSec = (startMs + (Number(seg.tOffsetMs) || 0)) / 1000;
          words.push([wStartSec, w]);
        }
      }
      const text = cleanCaptionText(combined);
      if (!text) continue;
      cues.push({
        start_ms: words.length ? Math.round(words[0][0] * 1000) : startMs,
        end_ms: endMs,
        text,
        ...(words.length > 1 ? { words } : {}),
      });
    }
    return cues;
  }

  function parseYouTubeXml(xml) {
    const cues = [];
    for (const m of xml.matchAll(/<p t="(\d+)"(?: d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g)) {
      const startMs = Number(m[1]);
      const endMs = startMs + Number(m[2] || 3000);
      const words = [];
      for (const s of m[3].matchAll(/<s(?: t="(\d+)")?[^>]*>([\s\S]*?)<\/s>/g)) {
        const w = cleanCaptionText(s[2]);
        if (w) words.push([(startMs + Number(s[1] || 0)) / 1000, w]);
      }
      const text = words.length ? words.map((w) => w[1]).join(" ") : cleanCaptionText(m[3]);
      if (!text) continue;
      cues.push({
        start_ms: words.length ? Math.round(words[0][0] * 1000) : startMs,
        end_ms: endMs,
        text,
        ...(words.length > 1 ? { words } : {}),
      });
    }
    if (!cues.length) {
      for (const m of xml.matchAll(/<text start="([\d.]+)"(?: dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g)) {
        const startMs = Math.round(parseFloat(m[1]) * 1000);
        const endMs = startMs + Math.round(parseFloat(m[2] || "3") * 1000);
        const text = cleanCaptionText(m[3]);
        if (!text) continue;
        cues.push({ start_ms: startMs, end_ms: endMs, text });
      }
    }
    return cues;
  }

  /**
   * Lấy phụ đề YouTube TRỰC TIẾP bằng trình duyệt & IP của người dùng (same-origin trên youtube.com)
   * → vượt hoàn toàn lỗi chặn vùng địa lý (ARD, WDR, ZDF), video thành viên, video giới hạn tuổi.
   */
  async function extractYouTubeSubtitlesFromBrowser(ytId) {
    try {
      const res = await fetch(`${location.origin}/watch?v=${ytId}`, { credentials: "include" });
      if (!res.ok) return null;
      const html = await res.text();
      const playerResp = extractJsonObjectAfter(html, /ytInitialPlayerResponse\s*=\s*\{/);
      const tracks = playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!Array.isArray(tracks) || !tracks.length) return null;

      const title = playerResp?.videoDetails?.title || document.title.replace(/\s*-\s*YouTube$/, "").trim() || ytId;
      const isAuto = (t) => t.kind === "asr";
      const isVi = (t) => String(t.languageCode || "").toLowerCase().startsWith("vi");
      const ordered = [
        ...tracks.filter((t) => !isAuto(t) && isVi(t)),
        ...tracks.filter((t) => !isAuto(t) && !isVi(t)),
        ...tracks.filter((t) => isAuto(t) && isVi(t)),
        ...tracks.filter((t) => isAuto(t) && !isVi(t)),
      ];

      for (const track of ordered) {
        if (!track.baseUrl) continue;
        // Ưu tiên fmt=json3 (có thời gian từng từ chính xác, parse cực nhanh)
        try {
          const uJson = new URL(track.baseUrl, location.origin);
          uJson.searchParams.set("fmt", "json3");
          const rJson = await fetch(uJson.toString(), { credentials: "include" });
          if (rJson.ok) {
            const text = await rJson.text();
            if (text.trim().startsWith("{")) {
              const cues = parseYouTubeJson3(JSON.parse(text));
              if (cues.length) {
                return { title, lang: String(track.languageCode || "auto").toLowerCase(), cues };
              }
            }
          }
        } catch {}

        // Dự phòng: XML srv3 / mặc định
        try {
          const uXml = new URL(track.baseUrl, location.origin);
          uXml.searchParams.set("fmt", "srv3");
          const rXml = await fetch(uXml.toString(), { credentials: "include" });
          if (rXml.ok) {
            const cues = parseYouTubeXml(await rXml.text());
            if (cues.length) {
              return { title, lang: String(track.languageCode || "auto").toLowerCase(), cues };
            }
          }
        } catch {}
      }
    } catch {}
    return null;
  }

  async function extractWebSubtitles(video) {
    // 1. Thử đọc trực tiếp từ video.textTracks (HTML5 / Coursera / Udemy / TED / Vimeo...)
    const tracks = Array.from(video.textTracks || []).filter((t) => t.kind === "subtitles" || t.kind === "captions");
    const preferred =
      tracks.find((t) => (t.language || "").toLowerCase().startsWith("vi")) ||
      tracks.find((t) => t.mode === "showing") ||
      tracks.find((t) => (t.language || "").toLowerCase().startsWith("en")) ||
      tracks[0];

    if (preferred) {
      const prevMode = preferred.mode;
      if (prevMode === "disabled") preferred.mode = "hidden";
      // Đợi tối đa 1.5s cho trình duyệt tải cue vào track
      for (let i = 0; i < 15; i++) {
        if (preferred.cues && preferred.cues.length > 0) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (preferred.cues && preferred.cues.length > 0) {
        const cues = Array.from(preferred.cues)
          .map((c) => ({
            start_ms: Math.max(0, Math.round(c.startTime * 1000)),
            end_ms: Math.max(Math.round(c.endTime * 1000), Math.round(c.startTime * 1000) + 150),
            text: String(c.text || "")
              .replace(/<[^>]+>/g, "")
              .replace(/\s+/g, " ")
              .trim(),
          }))
          .filter((c) => c.text);
        if (cues.length) {
          preferred.mode = "hidden";
          return { lang: preferred.language || "auto", cues };
        }
      }
      if (prevMode === "disabled") preferred.mode = prevMode;
    }

    // 2. Đọc từ thẻ <track src="...vtt|srt"> bên trong <video>
    const trackEls = Array.from(video.querySelectorAll("track[src]"));
    const pickEl =
      trackEls.find((el) => (el.srclang || "").toLowerCase().startsWith("vi")) ||
      trackEls.find((el) => el.default) ||
      trackEls.find((el) => (el.srclang || "").toLowerCase().startsWith("en")) ||
      trackEls[0];

    if (pickEl && pickEl.src) {
      const fetched = await chrome.runtime.sendMessage({ type: "hvn:fetch-text", url: pickEl.src });
      if (fetched?.ok && fetched.text) {
        const cues = parseSubtitleText(fetched.text);
        if (cues.length) return { lang: pickEl.srclang || "auto", cues };
      }
    }

    return null;
  }

  // ---------------- Streaming from Background ----------------

  function closePort() {
    if (state.port) {
      try {
        state.port.disconnect();
      } catch {}
      state.port = null;
    }
  }

  function startDubStream(reqType, payload, sourceMode, sourceKey) {
    const runId = ++state.streamRunId;
    closePort();
    stopSpeech();
    state.bufCache.clear();
    state.inflightTts.clear();
    state.enabled = true;
    state.loading = true;
    state.loadingPct = 8;
    state.loadingTarget = 34;
    state.loadingStartedAt = Date.now();
    state.bgProgress = null;
    state.error = "";
    state.sourceMode = sourceMode;
    state.sourceKey = sourceKey;
    state.cues = [];
    state.activeCueIdx = -1;
    state.lastSpokenIdx = -1;
    updateYtButton();
    renderHud();

    let becameReady = false;
    let bgAttempt = 0;

    const connectAttempt = () => {
      if (state.streamRunId !== runId || !state.enabled) return;
      closePort();
      const port = chrome.runtime.connect({ name: "hvn-dub-stream" });
      state.port = port;

      port.onMessage.addListener((msg) => {
        if (state.streamRunId !== runId || !state.enabled) return;

        if (msg.type === "progress") {
          if (!becameReady) {
            state.loadingTarget = smartTargetPct(msg.pct || 0);
            state.loadingPct = Math.max(state.loadingPct, Math.min(96, msg.pct || 0));
            renderHud();
          }
          return;
        }

        if (msg.type === "ready" && msg.data) {
          const firstReady = !becameReady;
          becameReady = true;
          state.loading = false;
          state.title = msg.data.title || document.title;
          state.cues = msg.data.cues || [];
          state.bgProgress = { pct: msg.pct || 20, done: msg.done || 0, total: msg.total || state.cues.length };
          state.error = "";
          if (firstReady && state.video) {
            state.lastVideoTime = state.video.currentTime;
            state.lastSpokenIdx = -1;
          }
          updateYtButton();
          renderHud();
          if (firstReady) {
            // Prefetch 3 câu quanh vị trí hiện tại ngay lập tức
            const curSec = state.video ? state.video.currentTime * 1000 : 0;
            const curMatch = state.cues.findIndex((c) => curSec <= c.end_ms + 800);
            const start = Math.max(0, curMatch >= 0 ? curMatch : 0);
            for (let k = start; k < Math.min(start + 3, state.cues.length); k++) {
              void getCueBuffer(k, state.settings.voiceId, state.settings.speed);
            }
          }
          return;
        }

        if (msg.type === "chunk" && Array.isArray(msg.translations)) {
          state.bgProgress = { pct: msg.pct || 50, done: msg.done || 0, total: msg.total || state.cues.length };
          const next = state.cues.slice();
          msg.translations.forEach((tr, k) => {
            const idx = msg.start + k;
            if (next[idx]) {
              next[idx] = {
                start_ms: next[idx].start_ms,
                end_ms: next[idx].end_ms,
                text: tr,
                orig: next[idx].orig,
                ...(tr ? {} : { untranslated: true }),
              };
            }
          });
          state.cues = next;
          renderHud();
          return;
        }

        if (msg.type === "done" && msg.data) {
          const firstReady = !becameReady;
          becameReady = true;
          state.loading = false;
          state.title = msg.data.title || document.title;
          state.cues = msg.data.cues || [];
          state.bgProgress = null;
          state.error = "";
          if (firstReady && state.video) {
            state.lastVideoTime = state.video.currentTime;
            state.lastSpokenIdx = -1;
          }
          closePort();
          updateYtButton();
          renderHud();
          if (firstReady) {
            const curSec = state.video ? state.video.currentTime * 1000 : 0;
            const curMatch = state.cues.findIndex((c) => curSec <= c.end_ms + 800);
            const start = Math.max(0, curMatch >= 0 ? curMatch : 0);
            for (let k = start; k < Math.min(start + 3, state.cues.length); k++) {
              void getCueBuffer(k, state.settings.voiceId, state.settings.speed);
            }
          }
          return;
        }

        if (msg.type === "stream-interrupted" || msg.type === "error") {
          closePort();
          // Nếu server chưa deploy /translate-cues (HTTP 404) trên YouTube → tự lùi về /prepare
          if (!becameReady && reqType === "translate-cues" && payload?.videoId && /HTTP 404/.test(msg.error || "")) {
            startDubStream("prepare-youtube", { videoId: payload.videoId }, "youtube", `yt:${payload.videoId}`);
            return;
          }
          if (becameReady && bgAttempt < BG_RECONNECT_DELAYS_MS.length) {
            const delay = BG_RECONNECT_DELAYS_MS[bgAttempt++];
            if (state.bgProgress) state.bgProgress = { ...state.bgProgress, reconnecting: true };
            renderHud();
            setTimeout(connectAttempt, delay);
            return;
          }
          state.loading = false;
          state.bgProgress = null;
          state.error = msg.error || "Mất kết nối tới máy chủ thuyết minh.";
          if (!becameReady) state.enabled = false;
          updateYtButton();
          renderHud();
        }
      });

      port.onDisconnect.addListener(() => {
        if (state.port === port) state.port = null;
      });

      port.postMessage({ type: reqType, payload });
    };

    connectAttempt();
  }

  async function startDubbing(customSubText) {
    const video = findBestVideo();
    if (!video) {
      state.error = "Không tìm thấy video đang phát trên trang này.";
      renderHud();
      return { ok: false, error: state.error };
    }

    getAudioCtx();
    attachVideo(video);

    if (customSubText) {
      const cues = parseSubtitleText(customSubText);
      if (!cues.length) {
        state.error = "File phụ đề không hợp lệ (.srt / .vtt).";
        renderHud();
        return { ok: false, error: state.error };
      }
      startDubStream(
        "translate-cues",
        { title: document.title, sourceLang: "auto", cues },
        "custom",
        `custom:${location.href}`,
      );
      return { ok: true };
    }

    const ytId = getYouTubeVideoId();
    if (ytId) {
      // Hiển thị loading ngay lập tức trong khi trình duyệt lấy phụ đề bằng chính IP/phiên YouTube của bạn
      state.enabled = true;
      state.loading = true;
      state.loadingPct = 10;
      state.loadingTarget = 32;
      state.loadingStartedAt = Date.now();
      state.error = "";
      updateYtButton();
      renderHud();

      // Ưu tiên lấy phụ đề trực tiếp từ trình duyệt (vượt 100% lỗi chặn vùng ARD/WDR/ZDF & không bị chặn IP server)
      const browserSubs = await extractYouTubeSubtitlesFromBrowser(ytId);
      if (!state.enabled) return { ok: false };

      if (browserSubs && browserSubs.cues.length) {
        startDubStream(
          "translate-cues",
          {
            videoId: ytId,
            title: browserSubs.title,
            sourceLang: browserSubs.lang,
            cues: browserSubs.cues,
          },
          "youtube",
          `yt:${ytId}`,
        );
        return { ok: true };
      }

      // Dự phòng (vd video hoàn toàn không có CC trên YouTube → để server chạy Whisper AI)
      startDubStream("prepare-youtube", { videoId: ytId }, "youtube", `yt:${ytId}`);
      return { ok: true };
    }

    // Mọi trang web khác có thẻ <video> + phụ đề (<track> / textTracks)
    state.enabled = true;
    state.loading = true;
    state.loadingPct = 10;
    state.loadingTarget = 30;
    state.loadingStartedAt = Date.now();
    state.error = "";
    renderHud();

    const extracted = await extractWebSubtitles(video);
    if (!extracted || !extracted.cues.length) {
      state.enabled = false;
      state.loading = false;
      detachVideo();
      state.error = "Video trên trang này không có phụ đề sẵn. Bạn có thể dán hoặc nạp file .SRT/.VTT trong biểu tượng tiện ích.";
      renderHud();
      return { ok: false, error: state.error };
    }

    startDubStream(
      "translate-cues",
      { title: document.title, sourceLang: extracted.lang, cues: extracted.cues },
      "web",
      `web:${location.href}`,
    );
    return { ok: true };
  }

  function stopDubbing() {
    state.streamRunId += 1;
    closePort();
    stopSpeech();
    state.enabled = false;
    state.loading = false;
    state.bgProgress = null;
    state.error = "";
    state.cues = [];
    state.activeCueIdx = -1;
    state.lastSpokenIdx = -1;
    state.bufCache.clear();
    state.inflightTts.clear();
    detachVideo();
    updateYtButton();
    renderHud();
  }

  function toggleDubbing() {
    if (state.enabled || state.loading) {
      stopDubbing();
    } else {
      void startDubbing();
    }
  }

  // ---------------- Sync & Loading Trickle Loops ----------------

  setInterval(() => {
    // Nội suy thanh % mượt trong khi đang tải
    if (state.loading) {
      const target = state.loadingTarget;
      if (state.loadingPct < target) {
        const gap = target - state.loadingPct;
        const step = gap > 18 ? 3 : gap > 8 ? 2 : 1;
        state.loadingPct = Math.min(target, state.loadingPct + step);
        renderHud();
      }
    }

    // Đồng bộ câu thoại theo <video>
    const video = state.video;
    const list = state.cues;
    if (!state.enabled || !video || !list.length) return;
    if (video.paused || video.ended || video.readyState < 2) {
      state.lastPollWall = 0;
      return;
    }

    const nowWall = performance.now();
    const dtWall = state.lastPollWall > 0 ? Math.max(0, (nowWall - state.lastPollWall) / 1000) : 0;
    state.lastPollWall = nowWall;

    const t = video.currentTime;
    const tMs = t * 1000;
    const rate = video.playbackRate || 1;
    const dtVideo = t - state.lastVideoTime;
    state.lastVideoTime = t;

    const seekedBack = dtVideo < -0.5;
    const seekedForward = dtVideo > Math.max(1.5, dtWall * rate + 1.2);
    const jumped = seekedBack || seekedForward;

    if (seekedBack) {
      stopSpeech();
      state.lastSpokenIdx = -1;
    } else if (seekedForward) {
      stopSpeech();
    }

    let curIdx = -1;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const nextStart = list[i + 1]?.start_ms ?? c.end_ms + 5000;
      if (tMs >= c.start_ms - 120 && tMs < Math.min(nextStart - 60, c.end_ms + 800)) {
        curIdx = i;
        break;
      }
    }

    if (!seekedBack && curIdx !== -1 && curIdx < state.lastSpokenIdx) {
      curIdx = state.lastSpokenIdx;
    }

    if (state.activeCueIdx !== curIdx) {
      state.activeCueIdx = curIdx;
      renderHud();
    }

    if (curIdx !== -1 && curIdx > state.lastSpokenIdx) {
      const curCue = list[curIdx];
      if (!curCue.pending && curCue.text?.trim()) {
        const lateMs = tMs - curCue.start_ms;
        const remainingMs = curCue.end_ms - tMs;
        if (!jumped || lateMs < 2500 || remainingMs > 1200) {
          state.lastSpokenIdx = curIdx;
          void speakCue(curIdx, jumped);
        } else {
          state.lastSpokenIdx = curIdx;
        }
      }
    }
  }, 100);

  // ---------------- HUD Overlay (Fullscreen-safe) ----------------

  function getHudHost() {
    if (document.fullscreenElement) return document.fullscreenElement;
    if (isYouTubeHost()) {
      const player = document.getElementById("movie_player");
      if (player) return player;
    }
    if (state.video && state.video.parentElement) {
      const p = state.video.parentElement;
      const cs = getComputedStyle(p);
      if (cs.position === "static") p.style.position = "relative";
      return p;
    }
    return document.body;
  }

  function ensureHud() {
    const host = getHudHost();
    if (!state.hudEl) {
      const el = document.createElement("div");
      el.className = "hvn-dub-hud";
      el.setAttribute("aria-live", "polite");
      state.hudEl = el;
    }
    if (state.hudEl.parentElement !== host) {
      host.appendChild(state.hudEl);
    }
    return state.hudEl;
  }

  function renderHud() {
    const showAnything =
      state.loading ||
      Boolean(state.error) ||
      (state.enabled && state.audioBlocked) ||
      (state.enabled && state.settings.showCaptions && state.activeCueIdx >= 0 && state.cues[state.activeCueIdx]);

    if (!showAnything) {
      if (state.hudEl) state.hudEl.style.display = "none";
      return;
    }

    const hud = ensureHud();
    hud.style.display = "flex";
    hud.textContent = "";

    if (state.loading) {
      const elapsed = Math.floor((Date.now() - state.loadingStartedAt) / 1000);
      const pill = document.createElement("div");
      pill.className = "hvn-dub-pill";

      const row = document.createElement("div");
      row.className = "hvn-dub-row";
      const dot = document.createElement("span");
      dot.className = "hvn-dub-dot";
      const label = document.createElement("span");
      label.textContent = smartLoadingLabel(state.loadingPct, elapsed);
      const pct = document.createElement("span");
      pct.className = "hvn-dub-pct";
      pct.textContent = `${state.loadingPct}%`;
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "hvn-dub-close";
      cancel.title = "Huỷ thuyết minh";
      cancel.textContent = "✕";
      cancel.addEventListener("click", (e) => {
        e.stopPropagation();
        stopDubbing();
      });
      row.append(dot, label, pct, cancel);

      const bar = document.createElement("div");
      bar.className = "hvn-dub-bar";
      const fill = document.createElement("div");
      fill.className = "hvn-dub-fill";
      fill.style.width = `${Math.max(8, state.loadingPct)}%`;
      bar.appendChild(fill);

      pill.append(row, bar);
      hud.appendChild(pill);
      return;
    }

    if (state.error) {
      const errBox = document.createElement("div");
      errBox.className = "hvn-dub-pill hvn-dub-err";
      const txt = document.createElement("span");
      txt.textContent = state.error;
      const close = document.createElement("button");
      close.type = "button";
      close.className = "hvn-dub-close";
      close.textContent = "✕";
      close.addEventListener("click", (e) => {
        e.stopPropagation();
        state.error = "";
        renderHud();
      });
      errBox.append(txt, close);
      hud.appendChild(errBox);
      return;
    }

    if (state.enabled && state.audioBlocked) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hvn-dub-unlock";
      btn.textContent = "🔊 Bấm vào đây để bật giọng thuyết minh tiếng Việt";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ctx = getAudioCtx();
        ctx
          .resume()
          .then(() => {
            if (ctx.state === "running") {
              state.audioBlocked = false;
              if (state.playback && state.playback.pausedOffset !== null) resumeSpeech();
              else if (state.activeSrcs.size === 0) state.lastSpokenIdx = -1;
              renderHud();
            }
          })
          .catch(() => {});
      });
      hud.appendChild(btn);
    }

    if (state.enabled && state.settings.showCaptions && state.activeCueIdx >= 0) {
      const cue = state.cues[state.activeCueIdx];
      if (cue && !cue.pending && (cue.text || cue.orig)) {
        const cap = document.createElement("div");
        cap.className = "hvn-dub-caption";
        const vi = document.createElement("div");
        vi.className = "hvn-dub-vi";
        vi.textContent = cue.untranslated ? `${cue.orig || ""} (chưa dịch)` : cue.text;
        cap.appendChild(vi);
        if (state.settings.showOrig && cue.orig && !cue.untranslated) {
          const orig = document.createElement("div");
          orig.className = "hvn-dub-orig";
          orig.textContent = cue.orig;
          cap.appendChild(orig);
        }
        hud.appendChild(cap);
      }
    }
  }

  document.addEventListener("fullscreenchange", () => {
    if (state.hudEl) renderHud();
  });

  // ---------------- YouTube Player Button ----------------

  function updateYtButton() {
    const btn = state.ytBtnEl;
    if (!btn) return;
    btn.classList.toggle("hvn-active", state.enabled);
    btn.classList.toggle("hvn-loading", state.loading);
    btn.title = state.loading
      ? "Đang chuẩn bị thuyết minh tiếng Việt…"
      : state.enabled
        ? "Đang bật Thuyết minh tiếng Việt (HalloVN) — Bấm để tắt"
        : "Bật Thuyết minh tiếng Việt (HalloVN)";
  }

  function injectYouTubeButton() {
    if (!isYouTubeHost()) return;
    const controls = document.querySelector(".ytp-right-controls");
    if (!controls) return;
    if (controls.querySelector(".hvn-yt-btn")) {
      state.ytBtnEl = controls.querySelector(".hvn-yt-btn");
      updateYtButton();
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ytp-button hvn-yt-btn";
    btn.setAttribute("aria-label", "Thuyết minh tiếng Việt HalloVN");
    btn.innerHTML = `<span class="hvn-yt-badge">VI</span>`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDubbing();
    });

    controls.insertBefore(btn, controls.firstChild);
    state.ytBtnEl = btn;
    updateYtButton();
  }

  // Theo dõi chuyển video SPA trên YouTube
  function handleNavigationChange() {
    if (location.href === state.lastUrl) return;
    state.lastUrl = location.href;
    const wasEnabled = state.enabled;
    const newYtId = getYouTubeVideoId();
    const sameKey = newYtId && state.sourceKey === `yt:${newYtId}`;
    if (sameKey) return;

    if (state.enabled || state.loading) {
      stopDubbing();
    }
    if (isYouTubeHost()) {
      setTimeout(() => {
        injectYouTubeButton();
        if (wasEnabled && state.settings.autoNextYouTube && newYtId) {
          void startDubbing();
        }
      }, 600);
    }
  }

  if (isYouTubeHost()) {
    window.addEventListener("yt-navigate-finish", () => {
      handleNavigationChange();
      injectYouTubeButton();
    });
    window.addEventListener("popstate", handleNavigationChange);
    // MutationObserver nhẹ đảm bảo nút luôn xuất hiện khi YouTube dựng player
    const obs = new MutationObserver(() => {
      if (!document.querySelector(".hvn-yt-btn")) injectYouTubeButton();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(injectYouTubeButton, 800);
  }

  // ---------------- Settings & Popup RPC ----------------

  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    state.settings = { ...DEFAULT_SETTINGS, ...items };
    applyVolumes();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    let voiceChanged = false;
    for (const [k, { newValue }] of Object.entries(changes)) {
      if (k in DEFAULT_SETTINGS && newValue !== undefined) {
        if (k === "voiceId" && state.settings.voiceId !== newValue) voiceChanged = true;
        state.settings[k] = newValue;
      }
    }
    if (voiceChanged) {
      stopSpeech();
      state.bufCache.clear();
      state.lastSpokenIdx = -1;
    }
    applyVolumes();
    renderHud();
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg.type !== "string") return false;

    if (msg.type === "hvn:get-status") {
      const ytId = getYouTubeVideoId();
      const video = findBestVideo();
      sendResponse({
        ok: true,
        enabled: state.enabled,
        loading: state.loading,
        loadingPct: state.loadingPct,
        bgProgress: state.bgProgress,
        error: state.error,
        hasVideo: Boolean(video),
        isYouTube: Boolean(ytId),
        videoId: ytId,
        title: state.title || document.title,
        cuesCount: state.cues.length,
      });
      return false;
    }

    if (msg.type === "hvn:toggle") {
      if (state.enabled || state.loading) {
        stopDubbing();
        sendResponse({ ok: true, enabled: false });
        return false;
      }
      startDubbing().then((r) => sendResponse({ ...r, enabled: state.enabled }));
      return true;
    }

    if (msg.type === "hvn:stop") {
      stopDubbing();
      sendResponse({ ok: true });
      return false;
    }

    if (msg.type === "hvn:dub-custom-sub") {
      startDubbing(msg.subtitleText || "").then((r) => sendResponse({ ...r, enabled: state.enabled }));
      return true;
    }

    return false;
  });
})();
