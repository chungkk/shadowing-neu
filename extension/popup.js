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

const $ = (id) => document.getElementById(id);
let activeTabId = null;

function showError(msg) {
  const el = $("errBox");
  if (!msg) {
    el.classList.add("hidden");
    el.textContent = "";
  } else {
    el.textContent = msg;
    el.classList.remove("hidden");
  }
}

function renderStatus(st) {
  const btn = $("toggleBtn");
  const hint = $("tabHint");
  const dot = $("stateDot");
  dot.className = "dot";

  if (!st || !st.ok) {
    btn.disabled = true;
    btn.classList.remove("active");
    btn.textContent = "Mở trang có video để bật";
    hint.textContent = "Chưa phát hiện video trên tab này";
    return;
  }

  if (st.error) showError(st.error);
  else showError("");

  if (st.loading) {
    dot.classList.add("loading");
    btn.disabled = false;
    btn.classList.add("active");
    btn.textContent = `Đang chuẩn bị (${st.loadingPct || 10}%) · Bấm để huỷ`;
    hint.textContent = st.isYouTube ? "YouTube · Đang mở thuyết minh" : "Video web · Đang mở thuyết minh";
    return;
  }

  if (st.enabled) {
    dot.classList.add("on");
    btn.disabled = false;
    btn.classList.add("active");
    btn.textContent = "Tắt thuyết minh tiếng Việt";
    hint.textContent = st.bgProgress
      ? `Đang phát · Tải thêm ${st.bgProgress.pct}%`
      : st.isYouTube
        ? "Đang thuyết minh trên YouTube"
        : "Đang thuyết minh video hiện tại";
    return;
  }

  btn.classList.remove("active");
  if (st.isYouTube) {
    btn.disabled = false;
    btn.textContent = "Bật thuyết minh tiếng Việt";
    hint.textContent = "Sẵn sàng trên video YouTube này";
  } else if (st.hasVideo) {
    btn.disabled = false;
    btn.textContent = "Bật thuyết minh cho video này";
    hint.textContent = "Phát hiện thẻ video trên trang";
  } else {
    btn.disabled = true;
    btn.textContent = "Không tìm thấy video trên trang";
    hint.textContent = "Hãy mở YouTube hoặc trang có phát video";
  }
}

async function queryActiveTabStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  if (!activeTabId) {
    renderStatus(null);
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage(activeTabId, { type: "hvn:get-status" });
    renderStatus(res);
  } catch {
    renderStatus(null);
  }
}

function applySettingsToUi(s) {
  document.querySelectorAll(".pill[data-voice]").forEach((el) => {
    el.classList.toggle("active", el.dataset.voice === s.voiceId);
  });
  $("origVol").value = String(s.origVol);
  $("origVolVal").textContent = `${s.origVol}%`;
  $("dubVol").value = String(s.dubVol);
  $("dubVolVal").textContent = `${s.dubVol}%`;
  $("speed").value = String(s.speed);
  $("speedVal").textContent = `${Number(s.speed).toFixed(2)}×`;
  $("showCaptions").checked = Boolean(s.showCaptions);
  $("showOrig").checked = Boolean(s.showOrig);
  $("autoNextYouTube").checked = Boolean(s.autoNextYouTube);
  $("apiBase").value = s.apiBase || DEFAULT_SETTINGS.apiBase;
}

function renderAuth(user) {
  if (user && (user.email || user.name)) {
    $("authSignedIn").classList.remove("hidden");
    $("loginForm").classList.add("hidden");
    $("authName").textContent = `Đã đăng nhập: ${user.name || user.email}`;
  } else {
    $("authSignedIn").classList.add("hidden");
    $("loginForm").classList.remove("hidden");
  }
}

function saveSetting(patch) {
  void chrome.storage.sync.set(patch);
}

async function init() {
  const cfg = await chrome.runtime.sendMessage({ type: "hvn:get-config" });
  if (cfg?.ok) {
    applySettingsToUi(cfg.settings);
    renderAuth(cfg.authUser);
  } else {
    applySettingsToUi(DEFAULT_SETTINGS);
  }

  await queryActiveTabStatus();
  const poll = setInterval(() => void queryActiveTabStatus(), 1000);
  window.addEventListener("unload", () => clearInterval(poll));

  $("toggleBtn").addEventListener("click", async () => {
    if (!activeTabId) return;
    showError("");
    try {
      const res = await chrome.tabs.sendMessage(activeTabId, { type: "hvn:toggle" });
      if (res && res.ok === false && res.error) showError(res.error);
      await queryActiveTabStatus();
    } catch {
      showError("Hãy tải lại trang video rồi thử bật lại tiện ích nhé.");
    }
  });

  document.querySelectorAll(".pill[data-voice]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const voiceId = btn.dataset.voice;
      document.querySelectorAll(".pill[data-voice]").forEach((b) => b.classList.toggle("active", b === btn));
      saveSetting({ voiceId });
    });
  });

  $("origVol").addEventListener("input", (e) => {
    const origVol = Number(e.target.value);
    $("origVolVal").textContent = `${origVol}%`;
    saveSetting({ origVol });
  });

  $("dubVol").addEventListener("input", (e) => {
    const dubVol = Number(e.target.value);
    $("dubVolVal").textContent = `${dubVol}%`;
    saveSetting({ dubVol });
  });

  $("speed").addEventListener("input", (e) => {
    const speed = Number(e.target.value);
    $("speedVal").textContent = `${speed.toFixed(2)}×`;
    saveSetting({ speed });
  });

  $("showCaptions").addEventListener("change", (e) => saveSetting({ showCaptions: e.target.checked }));
  $("showOrig").addEventListener("change", (e) => saveSetting({ showOrig: e.target.checked }));
  $("autoNextYouTube").addEventListener("change", (e) => saveSetting({ autoNextYouTube: e.target.checked }));
  $("apiBase").addEventListener("change", (e) => saveSetting({ apiBase: e.target.value }));

  $("uploadSubBtn").addEventListener("click", () => $("subFileInput").click());
  $("subFileInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeTabId) return;
    const text = await file.text();
    try {
      const res = await chrome.tabs.sendMessage(activeTabId, { type: "hvn:dub-custom-sub", subtitleText: text });
      if (res && res.ok === false && res.error) showError(res.error);
      await queryActiveTabStatus();
    } catch {
      showError("Không gửi được phụ đề tới trang hiện tại. Hãy tải lại trang video.");
    }
  });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    const email = $("loginEmail").value.trim();
    const password = $("loginPass").value;
    const res = await chrome.runtime.sendMessage({ type: "hvn:login", email, password });
    if (!res?.ok) {
      showError(res?.error || "Đăng nhập thất bại.");
      return;
    }
    $("loginPass").value = "";
    renderAuth(res.user);
  });

  $("logoutBtn").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "hvn:logout" });
    renderAuth(null);
  });
}

void init();
