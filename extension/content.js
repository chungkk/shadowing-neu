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
    loadingStage: "",
    pausedForLoad: false,
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
    // Phụ đề YouTube bắt trực tiếp từ trình phát (có sẵn PO token + IP người dùng)
    ytCapturedSubs: new Map(), // videoId -> { lang, text, title?, channel?, description? }
    ytTitles: new Map(), // videoId -> title
    ytMeta: new Map(), // videoId -> { title?, channel?, description? }
    ytSubWaiters: new Map(), // videoId -> Set<resolve>
  };

  window.addEventListener("message", (ev) => {
    if (ev.source !== window || !ev.data || ev.data.source !== "hvn-yt-hook") return;
    if (ev.data.type === "player-meta" && ev.data.videoId) {
      if (ev.data.title) state.ytTitles.set(ev.data.videoId, ev.data.title);
      state.ytMeta.set(ev.data.videoId, {
        title: ev.data.title || "",
        channel: ev.data.channel || "",
        description: ev.data.description || "",
      });
      return;
    }
    if (ev.data.type === "timedtext" && ev.data.videoId && ev.data.text) {
      const meta = state.ytMeta.get(ev.data.videoId);
      const entry = {
        lang: String(ev.data.lang || "auto").toLowerCase(),
        text: String(ev.data.text),
        title: ev.data.title || state.ytTitles.get(ev.data.videoId) || meta?.title || "",
        channel: ev.data.channel || meta?.channel || "",
        description: ev.data.description || meta?.description || "",
      };
      state.ytCapturedSubs.set(ev.data.videoId, entry);
      const waiters = state.ytSubWaiters.get(ev.data.videoId);
      if (waiters) {
        for (const fn of waiters) fn(entry);
        waiters.clear();
      }
    }
  });

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
    return (words * 0.27 + pauses * 0.14 + 0.18) / Math.max(0.75, speed);
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
      cues.push(...cleanCaptionLine(start, Math.max(end, start + 150), lines.slice(ti + 1).join(" ")));
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
        const pbRate = item.playbackRate || 1;
        const endAt = item.startedAtCtx + (item.buf.duration - item.baseOffset) / pbRate;
        if (now >= item.startedAtCtx && now < endAt - 0.15 / pbRate) {
          target = item;
          savedOffset = item.baseOffset + (now - item.startedAtCtx) * pbRate;
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

  async function fetchTtsBuffer(text, voiceId, speed, urgent = false) {
    const res = await chrome.runtime.sendMessage({
      type: "hvn:tts",
      text: truncateTtsText(text, EDGE_MAX_CHARS),
      voiceId,
      speed,
      urgent: Boolean(urgent),
    });
    if (!res?.ok || !res.base64) {
      throw new Error(res?.error || "Không tạo được giọng đọc.");
    }
    const ab = base64ToArrayBuffer(res.base64);
    return getAudioCtx().decodeAudioData(ab);
  }

  async function getCueBuffer(cueIndex, vId, spd, opts = {}) {
    const urgent = Boolean(opts && opts.urgent);
    const cue = state.cues[cueIndex];
    if (!cue || cue.pending || !cue.text?.trim()) return null;

    const normSpd = Math.round(spd * 20) / 20;
    const rate = Math.round(((state.video && state.video.playbackRate) || 1) * 20) / 20;
    // Key theo start_ms + text thay vì cueIndex để không bị đọc nhầm audio khi sự kiện done xoá các câu [SKIP]
    const key = `${vId}:${normSpd.toFixed(2)}:${rate.toFixed(2)}:${cue.start_ms}:${cue.text}`;
    const hit = state.bufCache.get(key);
    if (hit) {
      putBufCache(key, hit);
      return hit;
    }
    const existing = state.inflightTts.get(key);
    if (existing) {
      // Nếu câu đang chờ từ prefetch nay thành câu cần đọc ngay → báo server ưu tiên
      if (urgent && String(vId).startsWith("piper:")) {
        void chrome.runtime
          .sendMessage({
            type: "hvn:tts",
            text: truncateTtsText(cue.text, EDGE_MAX_CHARS),
            voiceId: vId,
            speed: normSpd,
            urgent: true,
          })
          .catch(() => {});
      }
      return existing;
    }

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

        let buf = await fetchTtsBuffer(cue.text, vId, firstSpd, urgent);
        // Câu đang cần phát ngay (`urgent`) KHÔNG chặn thêm 1 vòng TTS nữa; chỉ tinh chỉnh khi đang prefetch ngầm với giọng Edge
        const isEdge = String(vId).startsWith("edge:");
        if (!urgent && isEdge && buf && slot > 0.4 && buf.duration > slot + 0.45 && firstSpd < MAX_FIT_SPEED) {
          const need = Math.min(MAX_FIT_SPEED, Math.ceil(((firstSpd * buf.duration) / slot) * 20) / 20);
          if (need > firstSpd) {
            const fitted = await fetchTtsBuffer(cue.text, vId, need, false).catch(() => null);
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

  function prefetchAfter(startIdx, vId, spd) {
    const isPiper = String(vId).startsWith("piper:");
    const count = 3;
    const endIdx = Math.min(state.cues.length - 1, startIdx + count - 1);
    if (startIdx > endIdx) return;

    if (isPiper) {
      // Piper chạy tuần tự prefetch để câu đang đọc (urgent) luôn được ưu tiên tuyệt đối
      void (async () => {
        for (let k = startIdx; k <= endIdx; k++) {
          if (!state.enabled || state.settings.voiceId !== vId) break;
          await getCueBuffer(k, vId, spd, { urgent: false });
        }
      })();
    } else {
      for (let k = startIdx; k <= endIdx; k++) {
        void getCueBuffer(k, vId, spd, { urgent: false });
      }
    }
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

    const pbRate = pb.playbackRate || 1;
    const offset = pb.pausedOffset;
    const remaining = (pb.buf.duration - offset) / pbRate;
    if (remaining <= 0.12) {
      state.playback = null;
      return;
    }

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = pb.buf;
    src.playbackRate.value = pbRate;
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

    prefetchAfter(pb.cueIndex + 1, vId, spd);
  }

  async function speakCue(cueIndex, isSeek) {
    const video = state.video;
    if (!state.enabled || !video || video.paused || video.ended) return;
    const { voiceId: vId, speed: spd } = state.settings;
    const myStopGen = state.stopGen;

    // Luôn ưu tiên tải xong câu đang cần đọc TRƯỚC rồi mới prefetch các câu tiếp theo
    const buf = await getCueBuffer(cueIndex, vId, spd, { urgent: true });
    if (!buf) return;

    if (myStopGen !== state.stopGen || !state.enabled || !state.video || state.video.paused || state.video.ended) {
      if (state.lastSpokenIdx === cueIndex && state.playback?.cueIndex !== cueIndex) {
        state.lastSpokenIdx = cueIndex - 1;
      }
      return;
    }
    if (state.lastSpokenIdx !== cueIndex || state.settings.voiceId !== vId) return;

    prefetchAfter(cueIndex + 1, vId, spd);

    const ctx = getAudioCtx();
    const gain = state.gain;
    if (!gain) return;
    // Đảm bảo mức âm lượng thuyết minh luôn khớp cài đặt (không bao giờ kẹt ở 0)
    gain.gain.value = Math.min(1.8, Math.max(0, state.settings.dubVol / 100));
    if (ctx.state !== "running") {
      stopActiveSources();
      return;
    }

    if (isSeek) {
      stopSpeech();
    } else if (state.audioEndAt - ctx.currentTime > MAX_QUEUE_LAG_SEC) {
      stopActiveSources();
    }

    const next = state.cues[cueIndex + 1];
    const rate = Math.round(((state.video && state.video.playbackRate) || 1) * 20) / 20;
    const slot = next ? (next.start_ms - state.cues[cueIndex].start_ms) / 1000 / rate - 0.1 : 0;
    const pbRate = slot > 0.4 && buf.duration > slot + 0.3 ? Math.min(1.12, buf.duration / slot) : 1;
    const effectiveDur = buf.duration / pbRate;

    const now = ctx.currentTime;
    const startAt = Math.max(now, state.audioEndAt + 0.02);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pbRate;
    src.connect(gain);
    src.start(startAt);
    state.activeSrcs.add(src);

    const pb = {
      cueIndex,
      buf,
      startedAtCtx: startAt,
      baseOffset: 0,
      playbackRate: pbRate,
      voiceId: vId,
      pausedOffset: null,
    };
    state.scheduled.push(pb);
    if (state.scheduled.length === 1) state.playback = pb;
    state.audioEndAt = startAt + effectiveDur;

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
    if (state.video && state.enabled && !state.loading) {
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
      if (state.loading) {
        state.pausedForLoad = false;
        return;
      }
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

  const SDH_DESC_RE =
    /musik|klänge|klang|melodie|gesang|singt|singen|gesungen|summt|summen|lied|song|jingle|intro|outro|abspann|vorspann|titelmelodie|gitarre|klavier|piano|trommel|geige|bass|beat|takt|chor|orchester|streicher|synthesizer|rhythmus|rhythmisch|elektronisch|instrument|musikstück|soundtrack|music|singing|sings|humming|hums|choral|choir|guitar|violin|drums|melody|tune|theme|bgm|nhạc|âm\s+nhạc|ca\s+hát|ngân\s+nga|musique|música|音楽|歌|音乐|음악|applaus|beifall|klatsch\w*|jubel\w*|gelächter|lach\w*|kicher\w*|schmunzel\w*|seufz\w*|stöhn\w*|keuch\w*|hust\w*|nies\w*|räusper\w*|schnauf\w*|schnaub\w*|schnarch\w*|gähn\w*|pfeif\w*|weint|weinen|schluchz\w*|schreit|schreien|brüllt|brüllen|flüster\w*|murmel\w*|nuschel\w*|stotter\w*|kreisch\w*|zisch\w*|knurr\w*|bellt|bellen|miaut|zwitscher\w*|piep\w*|klingel\w*|läute\w*|klopf\w*|hämmert|knall\w*|krach\w*|donner\w*|raschel\w*|rauschen|rauscht|brumm\w*|surr\w*|klick\w*|ticken|tickt|quiet\w*|hupt|hupen|sirene|motor|schritte|tür|fenster|wind|regen|explosion|schuss|schüsse|stille|pause|ruhe|geräusch\w*|lärm|krächz\w*|knarr\w*|polter\w*|klirr\w*|plätsch\w*|schmatz\w*|atmet|atmen|unverständlich|undeutlich|durcheinander|stimmengewirr|gemurmel|hintergrund\w*|applause|clapping|claps|cheering|cheers|laughter|laughing|laughs|chuckles|chuckling|giggles|giggling|sighs|sighing|groans|groaning|gasps|gasping|coughs|coughing|sneezes|sneezing|clears\s+throat|snorts|snores|yawns|whistles|whistling|crying|cries|sobbing|sobs|weeping|screaming|screams|shouting|shouts|yelling|yells|whispering|whispers|mumbling|mumbles|murmuring|murmurs|stuttering|shrieks|hisses|growls|barking|barks|meows|chirping|beeping|beeps|ringing|rings|knocking|knocks|banging|bangs|slamming|slams|crashing|thunder|rustling|buzzing|clicking|clicks|ticking|honking|siren|engine|footsteps|explosion|gunshot|silence|silent|pause|noise|sound|sfx|inaudible|indistinct|unintelligible|crosstalk|chatter|overlapping|vỗ\s+tay|reo\s+hò|hoan\s+hô|tiếng\s+cười|\bcười\b|khúc\s+khích|thở\s+dài|rên|thở\s+hổn\s+hển|\bho\b|hắt\s+hơi|hắng\s+giọng|ngáy|ngáp|huýt\s+sáo|khóc|nức\s+nở|\bhét\b|la\s+hét|thì\s+thầm|lẩm\s+bẩm|tiếng\s+động|tiếng\s+ồn|âm\s+thanh|tiếng\s+\p{L}+|im\s+lặng|tĩnh\s+lặng|không\s+nghe\s+rõ|nghe\s+không\s+rõ|拍手|笑い|歓声|ため息|効果音|無音|掌声|笑声|박수|웃음|sprecher\w*|erzähler\w*|moderator\w*|reporter\w*|ansager\w*|kommentator\w*|stimme\w*|off[\s-]?stimme|aus\s+dem\s+off|^off$|voice[\s-]?over|narrator|announcer|commentator|speaker|interviewer|anchor|male\s+voice|female\s+voice|child'?s\s+voice|robotic\s+voice|computer\s+voice|automated\s+voice|on\s+(?:phone|radio|tv)|over\s+(?:speaker|radio|pa)|through\s+phone|im\s+(?:radio|fernsehen)|am\s+telefon|übers\s+telefon|durch\s+lautsprecher|archiv\w*|o-?ton|einspieler|untertitel|amara\.org|fremdsprach\w*|spricht\s+(?:englisch|französisch|spanisch|italienisch|türkisch|arabisch|russisch|chinesisch|japanisch|polnisch|deutsch|leise|laut|schnell|langsam|hektisch|aufgeregt|traurig|wütend|fröhlich|ernst|ironisch|sarkastisch)|speaking\s+(?:foreign|in\s+\p{L}+|softly|loudly|quietly|quickly|slowly|angrily|sadly|happily|sarcastically|german|english|french|spanish|arabic|russian|chinese|japanese|vietnamese)|giọng\s+(?:đọc|nói|nam|nữ|trẻ\s+em|người\s+dẫn|thuyết\s+minh|máy|nhỏ|lớn|trầm|cao|run|khàn|tức\s+giận|buồn|vui)|người\s+dẫn\s+chuyện|thuyết\s+minh|lồng\s+tiếng|bình\s+luận\s+viên|phát\s+thanh\s+viên|ngoại\s+ngữ|tiếng\s+nước\s+ngoài|nói\s+(?:nhỏ|to|nhanh|chậm)|qua\s+(?:điện\s+thoại|loa)|phụ\s+đề|^(?:leise|laut|ironisch|sarkastisch|ernst|traurig|wütend|fröhlich|erstaunt|überrascht|verwirrt|genervt|aufgeregt|entsetzt|skeptisch|nachdenklich|zögernd|spöttisch|energisch|sanft|ruhig|dynamisch|dramatisch|bedrohlich|düster|heiter|beschwingt|rockig|melancholisch|spannend|spannungsvoll|softly|quietly|loudly|sarcastically|angrily|sadly|happily|excitedly|nervously|hesitantly|mockingly|dramatically|whispered|muffled)$/iu;

  const SPEAKER_PREFIX_RE =
    /^(?:[-–—]\s*)?(?:off[\s-]?stimme|stimme\s+aus\s+dem\s+off|stimme|off|sprecher(?:in)?|erzähler(?:in)?|moderator(?:in)?|reporter(?:in)?|ansager(?:in)?|kommentator(?:in)?|frauenstimme|männerstimme|kinderstimme|computerstimme|roboterstimme|narrator|voice[\s-]?over|voiceover|announcer|commentator|host|speaker(?:\s*\d+)?|interviewer|male\s+voice|female\s+voice|giọng\s+đọc|giọng\s+nói|giọng\s+nam|giọng\s+nữ|giọng\s+thuyết\s+minh|người\s+dẫn\s+chuyện|người\s+dẫn|thuyết\s+minh|lồng\s+tiếng|bình\s+luận\s+viên|phát\s+thanh\s+viên|mc)\s*:\s*/iu;

  const CREDIT_LINE_RE =
    /^(?:untertitel\s+(?:von|im\s+auftrag|der|des|:)|subtitles?\s+(?:by|:)|captions?\s+(?:by|:)|closed\s+captions?\b|phụ\s+đề\s+(?:bởi|:)|việt\s*sub\b|amara\.org)/iu;

  function cleanCaptionText(s) {
    let out = decodeHtmlEntities(String(s || "").replace(/<[^>]+>|\{[^}]*\}/g, ""))
      .replace(/\[[^\]]*\]|［[^］]*］|【[^】]*】/g, " ")
      .replace(/[♪♫♬🎵🎶][^♪♫♬🎵🎶]*[♪♫♬🎵🎶]/g, " ");

    if (/^[\s–—-]*[♪♫♬🎵🎶]/.test(out)) return "";
    out = out.replace(/[♪♫♬🎵🎶]+/g, " ");
    if (/^[\s–—-]*([（(][^()（）]{1,140}[）)][\s–—.,!?;:]*)+$/.test(out)) return "";

    out = out
      .replace(/[（(]([^()（）]{1,120})[）)]/g, (full, inner) => (SDH_DESC_RE.test(inner.trim()) ? " " : full))
      .replace(/(^|\s)\*([^*]{1,60})\*(?=\s|$|[.,!?;:])/g, (full, sp, inner) =>
        SDH_DESC_RE.test(inner.trim()) ? sp : full,
      )
      .replace(/(?:^|\s)>>+\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(SPEAKER_PREFIX_RE, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!out || CREDIT_LINE_RE.test(out) || !/[\p{L}\p{N}]/u.test(out)) return "";
    return out;
  }

  // Dấu đổi lượt người nói: `>>` (phụ đề tự động YouTube), `- ` đầu dòng, `Sprecher:`… — phải bắt TRƯỚC khi lọc
  const MID_TURN_ARROW_RE = /\s*(?:>|&gt;){2,}\s*/i;
  const MID_TURN_DASH_RE = /(?<=[.!?…]["»“”'’)]*)\s+[-–—]\s+(?=\S)/;
  const ARROW_TOKEN_RE = /^(?:>|&gt;){2,}/i;

  function hasSpeakerTurnMarker(s) {
    const plain = decodeHtmlEntities(String(s || "").replace(/<[^>]+>|\{[^}]*\}/g, "")).trimStart();
    return /^>>+/.test(plain) || /^[-–—]\s+\S/.test(plain) || SPEAKER_PREFIX_RE.test(plain);
  }

  /**
   * Làm sạch 1 dòng phụ đề thô + tách theo lượt người nói (kể cả `>>` giữa dòng).
   * Trả về mảng cue { start_ms, end_ms, text, words?, turnBreak? } để server gộp câu & gán nhãn người nói A/B.
   */
  function cleanCaptionLine(startMs, endMs, raw, rawWords, rawJoined) {
    const firstTurn = hasSpeakerTurnMarker(rawJoined !== undefined ? rawJoined : raw);
    const out = [];
    let carry = false;
    const emit = (cue, turn) => {
      carry = carry || turn;
      if (!cue.text) return;
      out.push(carry ? { ...cue, turnBreak: true } : cue);
      carry = false;
    };
    const fromWords = (cleaned, fallbackStart, end) => ({
      start_ms: cleaned.words?.length ? Math.round(cleaned.words[0][0] * 1000) : fallbackStart,
      end_ms: end,
      text: cleaned.text,
      ...(cleaned.words?.length > 1 ? { words: cleaned.words } : {}),
    });

    if (rawWords && rawWords.length) {
      const groups = [[]];
      for (const w of rawWords) {
        const tok = String(w[1] || "").replace(/<[^>]+>/g, "").trim();
        if (ARROW_TOKEN_RE.test(tok) && groups[groups.length - 1].length) groups.push([]);
        groups[groups.length - 1].push(w);
      }
      if (groups.length === 1) {
        emit(fromWords(cleanWordTimings(rawWords, rawJoined), startMs, endMs), firstTurn);
        return out;
      }
      groups.forEach((g, i) => {
        const gStart = Math.round(g[0][0] * 1000);
        const gEnd = groups[i + 1] ? Math.round(groups[i + 1][0][0] * 1000) : endMs;
        emit(fromWords(cleanWordTimings(g), gStart, Math.max(gEnd, gStart + 150)), i === 0 ? firstTurn : true);
      });
      return out;
    }

    const plain = String(raw || "").replace(/<[^>]+>/g, " ");
    let parts = plain.split(MID_TURN_ARROW_RE);
    if (/^\s*[-–—]\s+\S/.test(plain)) {
      parts = parts.flatMap((p) => p.split(MID_TURN_DASH_RE)).map((p) => p.replace(/^\s*[-–—]\s+/, ""));
    }
    const total = parts.reduce((n, p) => n + p.length, 0) || 1;
    let t = startMs;
    parts.forEach((p, i) => {
      const dt = ((endMs - startMs) * p.length) / total;
      emit({ start_ms: Math.round(t), end_ms: Math.round(t + dt), text: cleanCaptionText(p) }, i === 0 ? firstTurn : true);
      t += dt;
    });
    if (out.length) out[out.length - 1].end_ms = endMs;
    return out.map((c) => ({ ...c, end_ms: Math.max(c.end_ms, c.start_ms + 150) }));
  }

  function cleanWordTimings(rawWords, rawJoined) {
    const rawTokens = [];
    for (const w of rawWords) {
      const t = decodeHtmlEntities(String(w[1] || "").replace(/<[^>]+>|\{[^}]*\}/g, "")).trim();
      if (t) rawTokens.push([w[0], t]);
    }
    const joined = rawJoined !== undefined ? rawJoined : rawTokens.map((w) => w[1]).join(" ");
    const cleaned = cleanCaptionText(joined);
    if (!cleaned) return { text: "" };
    if (rawTokens.length && rawTokens.map((w) => w[1]).join(" ") === cleaned) {
      return { text: cleaned, words: rawTokens };
    }
    if (!rawTokens.length) return { text: cleaned };

    const cleanTokens = cleaned.split(/\s+/);
    const aligned = [];
    let ri = 0;
    for (const tok of cleanTokens) {
      while (ri < rawTokens.length && rawTokens[ri][1] !== tok && !rawTokens[ri][1].includes(tok)) {
        ri++;
      }
      if (ri >= rawTokens.length) return { text: cleaned };
      aligned.push([rawTokens[ri][0], tok]);
      ri++;
    }
    return { text: cleaned, words: aligned };
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
      const rawWords = [];
      let combined = "";
      for (const seg of ev.segs) {
        const raw = typeof seg?.utf8 === "string" ? seg.utf8 : "";
        if (!raw || raw === "\n") continue;
        combined += raw;
        const w = decodeHtmlEntities(raw.replace(/<[^>]+>|\{[^}]*\}/g, "")).trim();
        if (w) {
          const wStartSec = (startMs + (Number(seg.tOffsetMs) || 0)) / 1000;
          rawWords.push([wStartSec, w]);
        }
      }
      cues.push(...cleanCaptionLine(startMs, endMs, combined, rawWords, combined));
    }
    return cues;
  }

  function parseYouTubeXml(xml) {
    const cues = [];
    for (const m of xml.matchAll(/<p t="(\d+)"(?: d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g)) {
      const startMs = Number(m[1]);
      const endMs = startMs + Number(m[2] || 3000);
      const rawMatches = [...m[3].matchAll(/<s(?: t="(\d+)")?[^>]*>([\s\S]*?)<\/s>/g)];
      if (rawMatches.length) {
        const rawJoined = rawMatches.map((s) => s[2]).join("");
        const rawWords = rawMatches
          .map((s) => [(startMs + Number(s[1] || 0)) / 1000, s[2]])
          .filter((w) => String(w[1] || "").trim());
        cues.push(...cleanCaptionLine(startMs, endMs, rawJoined, rawWords, rawJoined));
      } else {
        cues.push(...cleanCaptionLine(startMs, endMs, m[3]));
      }
    }
    if (!cues.length) {
      for (const m of xml.matchAll(/<text start="([\d.]+)"(?: dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g)) {
        const startMs = Math.round(parseFloat(m[1]) * 1000);
        const endMs = startMs + Math.round(parseFloat(m[2] || "3") * 1000);
        cues.push(...cleanCaptionLine(startMs, endMs, m[3]));
      }
    }
    return cues;
  }

  function parseCapturedYouTubeText(rawText) {
    const trimmed = String(rawText || "").trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("{")) {
      try {
        return parseYouTubeJson3(JSON.parse(trimmed));
      } catch {
        return [];
      }
    }
    if (trimmed.startsWith("<")) {
      return parseYouTubeXml(trimmed);
    }
    return parseSubtitleText(trimmed);
  }

  function waitForHookedSubtitles(ytId, timeoutMs = 2600) {
    const existing = state.ytCapturedSubs.get(ytId);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      let set = state.ytSubWaiters.get(ytId);
      if (!set) {
        set = new Set();
        state.ytSubWaiters.set(ytId, set);
      }
      const done = (val) => {
        clearTimeout(timer);
        set.delete(done);
        resolve(val);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      set.add(done);
      try {
        window.postMessage({ source: "hvn-content", type: "trigger-yt-subs", videoId: ytId }, "*");
      } catch {
        done(null);
      }
    });
  }

  function cleanYtTitle(raw) {
    return String(raw || "")
      .replace(/^\(\d+\)\s*/, "")
      .replace(/\s*-\s*YouTube$/, "")
      .trim();
  }

  async function extractFromPerformanceTimedtext(ytId) {
    try {
      const entries = performance.getEntriesByType("resource") || [];
      for (let i = entries.length - 1; i >= 0; i--) {
        const name = entries[i]?.name || "";
        if (!name.includes("/api/timedtext")) continue;
        let u;
        try {
          u = new URL(name);
        } catch {
          continue;
        }
        if (u.searchParams.get("v") !== ytId || u.searchParams.get("tlang")) continue;
        const lang = (u.searchParams.get("lang") || "auto").toLowerCase();
        const res = await fetch(name, { credentials: "include" });
        if (!res.ok) continue;
        const txt = await res.text();
        const cues = parseCapturedYouTubeText(txt);
        if (cues.length) {
          const meta = state.ytMeta.get(ytId);
          return {
            title: state.ytTitles.get(ytId) || meta?.title || cleanYtTitle(document.title) || ytId,
            channel: meta?.channel || "",
            description: meta?.description || "",
            lang,
            cues,
          };
        }
      }
    } catch {}
    return null;
  }

  /**
   * Lấy phụ đề YouTube TRỰC TIẾP bằng trình duyệt & IP của người dùng (same-origin trên youtube.com)
   * → vượt hoàn toàn lỗi chặn vùng địa lý (ARD, WDR, ZDF), PO token (pot), video thành viên, giới hạn tuổi.
   */
  async function extractYouTubeSubtitlesFromBrowser(ytId) {
    // 1. Đã bắt sẵn từ yt-hook (0ms!)
    const cached = state.ytCapturedSubs.get(ytId);
    if (cached) {
      const cues = parseCapturedYouTubeText(cached.text);
      if (cues.length) {
        const meta = state.ytMeta.get(ytId);
        return {
          title: cached.title || state.ytTitles.get(ytId) || meta?.title || cleanYtTitle(document.title) || ytId,
          channel: cached.channel || meta?.channel || "",
          description: cached.description || meta?.description || "",
          lang: cached.lang,
          cues,
        };
      }
    }

    // 2. Lấy lại từ PerformanceResourceTiming (nếu YouTube đã tải /api/timedtext kèm pot trước đó)
    const fromPerf = await extractFromPerformanceTimedtext(ytId);
    if (fromPerf && fromPerf.cues.length) return fromPerf;

    // 3. Nhờ yt-hook kích hoạt chính trình phát YouTube tải /api/timedtext có pot hợp lệ (~200ms)
    const hooked = await waitForHookedSubtitles(ytId, 2600);
    if (hooked) {
      const cues = parseCapturedYouTubeText(hooked.text);
      if (cues.length) {
        const meta = state.ytMeta.get(ytId);
        return {
          title: hooked.title || state.ytTitles.get(ytId) || meta?.title || cleanYtTitle(document.title) || ytId,
          channel: hooked.channel || meta?.channel || "",
          description: hooked.description || meta?.description || "",
          lang: hooked.lang,
          cues,
        };
      }
    }

    // 4. Dự phòng: đọc ytInitialPlayerResponse từ HTML trang watch (với video không yêu cầu pot)
    try {
      const res = await fetch(`${location.origin}/watch?v=${ytId}`, { credentials: "include" });
      if (!res.ok) return null;
      const html = await res.text();
      const playerResp = extractJsonObjectAfter(html, /ytInitialPlayerResponse\s*=\s*\{/);
      const tracks = playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!Array.isArray(tracks) || !tracks.length) return null;

      const title = playerResp?.videoDetails?.title || cleanYtTitle(document.title) || ytId;
      const channel = String(playerResp?.videoDetails?.author || "").trim();
      const description = String(playerResp?.videoDetails?.shortDescription || "").slice(0, 1500);
      const isAuto = (t) => t.kind === "asr" || String(t.vssId || "").startsWith("a.");
      const baseLang = (code) => String(code || "").toLowerCase().split(/[-_]/)[0];
      const origBase =
        baseLang(playerResp?.videoDetails?.defaultAudioLanguage) ||
        baseLang(tracks.find(isAuto)?.languageCode);
      const isVi = (t) => baseLang(t.languageCode) === "vi";
      const isOrig = (t) => Boolean(origBase) && baseLang(t.languageCode) === origBase;
      const isEnOrDe = (t) => {
        const b = baseLang(t.languageCode);
        return b === "en" || b === "de";
      };
      const seenTracks = new Set();
      const ordered = [
        ...tracks.filter((t) => !isAuto(t) && isVi(t)),
        ...tracks.filter((t) => !isAuto(t) && isOrig(t)),
        ...tracks.filter((t) => isAuto(t) && isVi(t)),
        ...tracks.filter((t) => isAuto(t) && isOrig(t)),
        ...tracks.filter((t) => !isAuto(t) && isEnOrDe(t)),
        ...tracks.filter((t) => !isAuto(t)),
        ...tracks.filter((t) => isAuto(t)),
      ].filter((t) => {
        if (seenTracks.has(t)) return false;
        seenTracks.add(t);
        return true;
      });

      for (const track of ordered) {
        if (!track.baseUrl) continue;
        try {
          const uJson = new URL(track.baseUrl, location.origin);
          uJson.searchParams.set("fmt", "json3");
          const rJson = await fetch(uJson.toString(), { credentials: "include" });
          if (rJson.ok) {
            const cues = parseCapturedYouTubeText(await rJson.text());
            if (cues.length) {
              return { title, channel, description, lang: String(track.languageCode || "auto").toLowerCase(), cues };
            }
          }
        } catch {}

        try {
          const uXml = new URL(track.baseUrl, location.origin);
          uXml.searchParams.set("fmt", "srv3");
          const rXml = await fetch(uXml.toString(), { credentials: "include" });
          if (rXml.ok) {
            const cues = parseCapturedYouTubeText(await rXml.text());
            if (cues.length) {
              return { title, channel, description, lang: String(track.languageCode || "auto").toLowerCase(), cues };
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
      for (const opts of [{ credentials: "same-origin" }, { credentials: "omit" }]) {
        try {
          const res = await fetch(pickEl.src, opts);
          if (res.ok) {
            const text = await res.text();
            const cues = parseSubtitleText(text);
            if (cues.length) return { lang: pickEl.srclang || "auto", cues };
          }
        } catch {}
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

  function findCueIndexAt(tMs) {
    const list = state.cues;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const nextStart = list[i + 1]?.start_ms ?? c.end_ms + 5000;
      if (tMs >= c.start_ms - 120 && tMs < Math.min(nextStart - 60, c.end_ms + 800)) {
        return i;
      }
    }
    return -1;
  }

  function syncActiveCueFromVideo() {
    if (!state.video || !state.cues.length) return;
    const idx = findCueIndexAt(state.video.currentTime * 1000);
    if (idx !== -1) state.activeCueIdx = idx;
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
    state.loadingStage = "";
    state.bgProgress = null;
    state.error = "";
    state.sourceMode = sourceMode;
    state.sourceKey = sourceKey;
    state.cues = [];
    state.activeCueIdx = -1;
    state.lastSpokenIdx = -1;
    applyVolumes();
    updateYtButton();
    renderHud();

    let becameReady = false;
    let audioActivated = false;
    let activatingAudio = false;
    let bgAttempt = 0;

    const activateWhenAudioReady = (isDone) => {
      if (audioActivated || activatingAudio || state.streamRunId !== runId || !state.enabled) return;
      const curMs = state.video ? state.video.currentTime * 1000 : 0;
      const curMatch = state.cues.findIndex((c) => curMs <= c.end_ms + 800);
      const start = Math.max(0, curMatch >= 0 ? curMatch : 0);
      const targetCue = state.cues[start];

      // Nếu câu ở vị trí đang xem vẫn đang chờ dịch lô sau → giữ nguyên màn loading, đợi chunk về rồi mới mở tiếng
      if (!isDone && targetCue && targetCue.pending) {
        state.loadingTarget = Math.max(state.loadingTarget, 82);
        state.loadingStage = "Đang dịch đoạn bạn đang xem…";
        renderHud();
        return;
      }

      activatingAudio = true;
      state.loadingTarget = 96;
      state.loadingPct = Math.max(state.loadingPct, 88);
      state.loadingStage = "Đang chuẩn bị giọng tiếng Việt…";
      renderHud();

      void (async () => {
        if (targetCue && !targetCue.pending && targetCue.text?.trim()) {
          await getCueBuffer(start, state.settings.voiceId, state.settings.speed, { urgent: true });
        }
        if (state.streamRunId !== runId || !state.enabled) return;
        audioActivated = true;
        activatingAudio = false;
        state.loading = false;
        state.loadingStage = "";
        applyVolumes();
        if (state.video) {
          state.lastVideoTime = state.video.currentTime;
          state.lastSpokenIdx = -1;
          syncActiveCueFromVideo();
        }
        updateYtButton();
        renderHud();
        prefetchAfter(start + 1, state.settings.voiceId, state.settings.speed);
        if (state.pausedForLoad && state.video) {
          state.pausedForLoad = false;
          state.video.play().catch(() => {});
        }
      })();
    };

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
          becameReady = true;
          state.title = msg.data.title || document.title;
          state.cues = msg.data.cues || [];
          state.bgProgress = { pct: msg.pct || 20, done: msg.done || 0, total: msg.total || state.cues.length };
          state.error = "";
          activateWhenAudioReady(false);
          return;
        }

        if (msg.type === "chunk" && Array.isArray(msg.translations)) {
          state.bgProgress = { pct: msg.pct || 50, done: msg.done || 0, total: msg.total || state.cues.length };
          const skipSet = new Set(Array.isArray(msg.skipped) ? msg.skipped : []);
          const next = state.cues.slice();
          msg.translations.forEach((tr, k) => {
            const idx = msg.start + k;
            if (next[idx]) {
              const isSkip = skipSet.has(k);
              next[idx] = {
                start_ms: next[idx].start_ms,
                end_ms: next[idx].end_ms,
                text: tr,
                orig: next[idx].orig,
                ...(tr || isSkip ? {} : { untranslated: true }),
              };
            }
          });
          state.cues = next;
          if (!audioActivated) {
            activateWhenAudioReady(false);
            return;
          }
          syncActiveCueFromVideo();
          renderHud();
          const active = Math.max(0, state.activeCueIdx);
          const chunkEnd = msg.start + msg.translations.length - 1;
          if (chunkEnd >= active && msg.start <= active + 3) {
            prefetchAfter(active + 1, state.settings.voiceId, state.settings.speed);
          }
          return;
        }

        if (msg.type === "done" && msg.data) {
          becameReady = true;
          state.title = msg.data.title || document.title;
          const prevCues = state.cues;
          const nextCues = msg.data.cues || [];
          // Nếu gói done đã loại bỏ các câu [SKIP], ánh xạ lại chỉ số câu đang đọc theo start_ms
          if (prevCues.length > 0 && nextCues.length > 0 && prevCues.length !== nextCues.length) {
            const remapIdx = (oldIdx) => {
              if (oldIdx < 0) return oldIdx;
              const targetMs = prevCues[oldIdx]?.start_ms;
              if (typeof targetMs !== "number") return -1;
              const exact = nextCues.findIndex((c) => c.start_ms === targetMs);
              if (exact >= 0) return exact;
              let floor = -1;
              for (let i = 0; i < nextCues.length; i++) {
                if (nextCues[i].start_ms <= targetMs) floor = i;
                else break;
              }
              return floor;
            };
            state.lastSpokenIdx = remapIdx(state.lastSpokenIdx);
            if (state.playback) {
              const mapped = remapIdx(state.playback.cueIndex);
              if (mapped >= 0) state.playback.cueIndex = mapped;
            }
            for (const pb of state.scheduled) {
              const mapped = remapIdx(pb.cueIndex);
              if (mapped >= 0) pb.cueIndex = mapped;
            }
          }
          state.cues = nextCues;
          state.bgProgress = null;
          state.error = "";
          closePort();
          if (!audioActivated) {
            activateWhenAudioReady(true);
            return;
          }
          state.loading = false;
          state.loadingStage = "";
          applyVolumes();
          syncActiveCueFromVideo();
          updateYtButton();
          renderHud();
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
          state.loadingStage = "";
          state.pausedForLoad = false;
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

      port.postMessage({ type: reqType, payload: { ...payload, voiceId: state.settings.voiceId } });
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
    if (!video.paused && !video.ended) {
      state.pausedForLoad = true;
      try {
        video.pause();
      } catch {}
    } else {
      state.pausedForLoad = false;
    }

    if (customSubText) {
      const cues = parseSubtitleText(customSubText);
      if (!cues.length) {
        state.pausedForLoad = false;
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
      state.loadingStage = "";
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
            ...(browserSubs.channel ? { channel: browserSubs.channel } : {}),
            ...(browserSubs.description ? { description: browserSubs.description } : {}),
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
    state.loadingStage = "";
    state.error = "";
    renderHud();

    const extracted = await extractWebSubtitles(video);
    if (!extracted || !extracted.cues.length) {
      state.enabled = false;
      state.loading = false;
      state.pausedForLoad = false;
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
    state.loadingStage = "";
    state.pausedForLoad = false;
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
    if (!state.enabled || state.loading || !video || !list.length) return;
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

    let curIdx = findCueIndexAt(tMs);

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
      label.textContent = state.loadingStage || smartLoadingLabel(state.loadingPct, elapsed);
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

  // Tự mở khoá AudioContext khi người dùng bấm/gõ bất kỳ đâu trên trang (nếu bật từ popup bị Chrome treo autoplay)
  const unlockAudioOnGesture = () => {
    if (!state.enabled || !state.audioBlocked || !state.ctx) return;
    state.ctx
      .resume()
      .then(() => {
        if (state.ctx && state.ctx.state === "running") {
          state.audioBlocked = false;
          if (state.playback && state.playback.pausedOffset !== null) resumeSpeech();
          else if (state.activeSrcs.size === 0) state.lastSpokenIdx = -1;
          renderHud();
        }
      })
      .catch(() => {});
  };
  window.addEventListener("pointerdown", unlockAudioOnGesture, { passive: true });
  window.addEventListener("keydown", unlockAudioOnGesture, { passive: true });

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
