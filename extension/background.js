const DEFAULT_API_BASE = "https://hallovn.de";

const DEFAULT_SETTINGS = {
  apiBase: DEFAULT_API_BASE,
  voiceId: "edge:vi-VN-NamMinhNeural",
  speed: 1.15,
  origVol: 25,
  dubVol: 115,
  showCaptions: true,
  showOrig: false,
  autoNextYouTube: false,
};

let cachedConfig = null;

chrome.storage.onChanged.addListener(() => {
  cachedConfig = null;
});

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(DEFAULT_SETTINGS),
    chrome.storage.local.get({ authToken: "", authUser: null }),
  ]);
  cachedConfig = {
    settings: { ...DEFAULT_SETTINGS, ...syncData, apiBase: DEFAULT_API_BASE },
    authToken: typeof localData.authToken === "string" ? localData.authToken : "",
    authUser: localData.authUser || null,
  };
  return cachedConfig;
}

const MAX_BG_TTS_CACHE = 48;
const bgTtsCache = new Map();
const bgTtsInflight = new Map();

function putBgTtsCache(key, base64) {
  if (bgTtsCache.has(key)) bgTtsCache.delete(key);
  bgTtsCache.set(key, base64);
  while (bgTtsCache.size > MAX_BG_TTS_CACHE) {
    const oldest = bgTtsCache.keys().next().value;
    if (oldest !== undefined) bgTtsCache.delete(oldest);
    else break;
  }
}

function authHeaders(token, extra = {}) {
  const h = { ...extra };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Long-lived Port để stream NDJSON cuốn chiếu (ready + chunk + done) trực tiếp về content script
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "hvn-dub-stream") return;
  let ac = null;
  let disconnected = false;

  port.onDisconnect.addListener(() => {
    disconnected = true;
    ac?.abort();
  });

  const safePost = (msg) => {
    if (disconnected) return;
    try {
      port.postMessage(msg);
    } catch {
      disconnected = true;
      ac?.abort();
    }
  };

  port.onMessage.addListener(async (req) => {
    if (!req || (req.type !== "prepare-youtube" && req.type !== "translate-cues")) return;
    ac?.abort();
    ac = new AbortController();

    try {
      const { settings, authToken } = await getConfig();
      const endpoint =
        req.type === "prepare-youtube"
          ? `${settings.apiBase}/api/v1/dub/prepare?stream=1`
          : `${settings.apiBase}/api/v1/dub/translate-cues?stream=1`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: authHeaders(authToken, {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        }),
        body: JSON.stringify(req.payload || {}),
        signal: ac.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        safePost({
          type: "error",
          error: errJson.error || `Không thể kết nối máy chủ (HTTP ${res.status}).`,
        });
        return;
      }

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("ndjson") || !res.body) {
        const data = await res.json();
        safePost({ type: "done", data });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let gotDone = false;

      const handleLine = (raw) => {
        const line = raw.trim();
        if (!line) return;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          return;
        }
        if (msg.type === "done") gotDone = true;
        if (msg.type !== "ping") safePost(msg);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl = buf.indexOf("\n");
        while (nl !== -1) {
          handleLine(buf.slice(0, nl));
          buf = buf.slice(nl + 1);
          nl = buf.indexOf("\n");
        }
      }
      buf += decoder.decode();
      if (buf.trim()) handleLine(buf);

      if (!gotDone && !disconnected) {
        safePost({ type: "stream-interrupted" });
      }
    } catch (e) {
      if (e?.name === "AbortError" || disconnected) return;
      safePost({
        type: "error",
        error: e?.message || "Mất kết nối tới máy chủ thuyết minh.",
      });
    }
  });
});

// One-shot RPC cho TTS MP3 và đăng nhập/đăng xuất HalloVN
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg.type !== "string") return false;

  if (msg.type === "hvn:tts") {
    (async () => {
      try {
        const { settings, authToken } = await getConfig();
        const voice = String(msg.voiceId || settings.voiceId);
        const spdStr = Number(msg.speed || settings.speed).toFixed(2);
        const text = String(msg.text || "").slice(0, 600);
        const cacheKey = `${voice}|${spdStr}|${text}`;

        const memHit = bgTtsCache.get(cacheKey);
        if (memHit) {
          putBgTtsCache(cacheKey, memHit);
          sendResponse({ ok: true, base64: memHit });
          return;
        }

        const qs = new URLSearchParams({
          v: voice,
          s: spdStr,
          t: text,
        });
        if (msg.urgent) qs.set("p", "1");
        const url = `${settings.apiBase}/api/v1/dub/tts?${qs.toString()}`;

        // Nếu chưa có task inflight hoặc là urgent Piper (để thúc ưu tiên hàng đợi trên server)
        let job = bgTtsInflight.get(cacheKey);
        if (!job || (msg.urgent && voice.startsWith("piper:"))) {
          const runFetch = async () => {
            const opts = { headers: authHeaders(authToken) };
            let res = null;
            let lastErr = null;
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                res = await fetch(url, opts);
                if (res.ok || (res.status !== 502 && res.status !== 503 && res.status !== 504)) break;
              } catch (e) {
                lastErr = e;
              }
              if (attempt === 0) await new Promise((r) => setTimeout(r, 150));
            }
            if (!res) {
              throw lastErr || new Error("Không tải được âm thanh thuyết minh.");
            }
            if (!res.ok) {
              const errJson = await res.json().catch(() => ({}));
              throw new Error(errJson.error || `TTS HTTP ${res.status}`);
            }
            const ab = await res.arrayBuffer();
            const b64 = arrayBufferToBase64(ab);
            putBgTtsCache(cacheKey, b64);
            return b64;
          };
          if (!job) {
            job = runFetch().finally(() => bgTtsInflight.delete(cacheKey));
            bgTtsInflight.set(cacheKey, job);
          } else {
            // Chạy song song request urgent để server promote job trong queue nhưng vẫn dùng chung kết quả đầu về
            void runFetch().catch(() => {});
          }
        }

        const base64 = await job;
        sendResponse({ ok: true, base64 });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || "Không tải được âm thanh thuyết minh." });
      }
    })();
    return true;
  }

  if (msg.type === "hvn:login") {
    (async () => {
      try {
        const { settings } = await getConfig();
        const res = await fetch(`${settings.apiBase}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: msg.email, password: msg.password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.token) {
          sendResponse({ ok: false, error: data.error || "Đăng nhập thất bại." });
          return;
        }
        await chrome.storage.local.set({ authToken: data.token, authUser: data.user || null });
        sendResponse({ ok: true, user: data.user || null });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || "Không kết nối được máy chủ HalloVN." });
      }
    })();
    return true;
  }

  if (msg.type === "hvn:logout") {
    chrome.storage.local.remove(["authToken", "authUser"], () => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "hvn:get-config") {
    getConfig().then((cfg) => sendResponse({ ok: true, ...cfg }));
    return true;
  }

  return false;
});
