(() => {
  if (window.__hvnYtHookInstalled) return;
  window.__hvnYtHookInstalled = true;

  const captured = new Map(); // videoId -> { videoId, lang, text, url }

  function parseTimedtextUrl(rawUrl) {
    try {
      const u = new URL(rawUrl, location.origin);
      if (!u.pathname.includes("/api/timedtext")) return null;
      const videoId = u.searchParams.get("v") || "";
      const lang = (u.searchParams.get("lang") || u.searchParams.get("tlang") || "auto").toLowerCase();
      if (!videoId) return null;
      return { videoId, lang, url: u.toString() };
    } catch {
      return null;
    }
  }

  function emitCaptured(meta, text) {
    if (!meta || !text || !text.trim()) return;
    const payload = { ...meta, text };
    captured.set(meta.videoId, payload);
    try {
      window.postMessage({ source: "hvn-yt-hook", type: "timedtext", ...payload }, "*");
    } catch {}
  }

  // 1. Bắt response từ fetch() của chính trình phát YouTube (đã có sẵn pot token & IP người dùng)
  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (...args) {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
      const meta = url ? parseTimedtextUrl(url) : null;
      const promise = origFetch.apply(this, args);
      if (meta) {
        promise
          .then((res) => {
            if (!res || !res.ok) return;
            res
              .clone()
              .text()
              .then((txt) => emitCaptured(meta, txt))
              .catch(() => {});
          })
          .catch(() => {});
      }
      return promise;
    };
  }

  // 2. Bắt response từ XMLHttpRequest của trình phát YouTube
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__hvnMeta = typeof url === "string" ? parseTimedtextUrl(url) : null;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__hvnMeta) {
      const meta = this.__hvnMeta;
      this.addEventListener(
        "load",
        () => {
          try {
            if (this.status >= 200 && this.status < 300 && typeof this.responseText === "string") {
              emitCaptured(meta, this.responseText);
            }
          } catch {}
        },
        { once: true },
      );
    }
    return origSend.apply(this, args);
  };

  function pickBestTrack(tracks) {
    if (!Array.isArray(tracks) || !tracks.length) return null;
    const isAuto = (t) => t.kind === "asr" || String(t.vssId || "").startsWith("a.");
    const isVi = (t) => String(t.languageCode || "").toLowerCase().startsWith("vi");
    return (
      tracks.find((t) => !isAuto(t) && isVi(t)) ||
      tracks.find((t) => !isAuto(t)) ||
      tracks.find((t) => isAuto(t) && isVi(t)) ||
      tracks[0]
    );
  }

  // 3. Cho phép content script yêu cầu tiêu đề + kích hoạt YouTube player tự tải phụ đề (kèm pot hợp lệ)
  window.addEventListener("message", (ev) => {
    if (ev.source !== window || !ev.data || ev.data.source !== "hvn-content") return;
    if (ev.data.type !== "trigger-yt-subs") return;
    const videoId = String(ev.data.videoId || "");
    if (!videoId) return;

    const player = document.getElementById("movie_player");
    let playerResp = null;
    try {
      playerResp = player?.getPlayerResponse?.() || window.ytInitialPlayerResponse || null;
    } catch {}

    const title = playerResp?.videoDetails?.title || document.title.replace(/\s*-\s*YouTube$/, "").trim() || videoId;
    try {
      window.postMessage({ source: "hvn-yt-hook", type: "player-meta", videoId, title }, "*");
    } catch {}

    // Nếu đã bắt sẵn trong bộ nhớ → trả ngay lập tức
    const hit = captured.get(videoId);
    if (hit) {
      try {
        window.postMessage({ source: "hvn-yt-hook", type: "timedtext", ...hit, title }, "*");
      } catch {}
      return;
    }

    // Nếu chưa bật CC → nhờ chính player YouTube nạp track phụ đề tốt nhất để hook bắt gói timedtext có pot
    if (!player) return;
    try {
      player.loadModule?.("captions");
      const prevTrack = player.getOption?.("captions", "track");
      const tracklist =
        player.getOption?.("captions", "tracklist") ||
        playerResp?.captions?.playerCaptionsTracklistRenderer?.captionTracks ||
        [];
      const best = pickBestTrack(tracklist);
      if (best) {
        const trackArg = best.vssId
          ? { languageCode: best.languageCode, vssId: best.vssId }
          : { languageCode: best.languageCode };
        // Đổi nhẹ track để chắc chắn YouTube bắn request /api/timedtext mới
        if (prevTrack && prevTrack.languageCode === best.languageCode) {
          player.setOption?.("captions", "track", {});
        }
        const applyTrack = () => {
          try {
            player.setOption?.("captions", "track", trackArg);
          } catch {}
        };
        setTimeout(applyTrack, 60);
        // Nếu module captions tải chậm, thử lại bằng setOption hoặc bật nút CC một nhịp
        setTimeout(() => {
          if (captured.has(videoId)) return;
          applyTrack();
          try {
            const ccBtn = document.querySelector(".ytp-subtitles-button");
            if (ccBtn && ccBtn.getAttribute("aria-pressed") === "false") {
              ccBtn.click();
              setTimeout(() => {
                if (!prevTrack || !prevTrack.languageCode) {
                  try {
                    if (ccBtn.getAttribute("aria-pressed") === "true") ccBtn.click();
                  } catch {}
                }
              }, 1100);
            }
          } catch {}
        }, 550);
        // Nếu trước đó người dùng không bật CC, tắt lại CC gốc sau khi đã bắt được
        if (!prevTrack || !prevTrack.languageCode) {
          setTimeout(() => {
            try {
              player.setOption?.("captions", "track", {});
            } catch {}
          }, 1700);
        }
      }
    } catch {}
  });
})();
