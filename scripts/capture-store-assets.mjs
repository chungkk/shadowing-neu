import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const EXT_DIR = path.join(ROOT, "extension");
const OUT_DIR = path.join(ROOT, "dist", "store-assets");
fs.mkdirSync(OUT_DIR, { recursive: true });

const icon128DataUri = `data:image/png;base64,${fs.readFileSync(path.join(EXT_DIR, "icons/icon128.png")).toString("base64")}`;
const icon48DataUri = `data:image/png;base64,${fs.readFileSync(path.join(EXT_DIR, "icons/icon48.png")).toString("base64")}`;
const popupCss = fs.readFileSync(path.join(EXT_DIR, "popup.css"), "utf8");
const contentCss = fs.readFileSync(path.join(EXT_DIR, "content.css"), "utf8");

function buildPopupMarkup({ activeVoice = "piper:adam_bua", origVol = 15, dubVol = 115, speed = "1.15", showOrig = true }) {
  return `
    <div class="popup-shell">
      <div class="wrap">
        <header class="head">
          <div class="brand">
            <img src="${icon48DataUri}" alt="HalloVN" class="logo" />
            <div>
              <h1>HalloVN Thuyết minh</h1>
              <p class="sub">Đang thuyết minh trên YouTube</p>
            </div>
          </div>
          <span class="dot on" aria-hidden="true"></span>
        </header>

        <button type="button" class="btn-main active">Tắt thuyết minh tiếng Việt</button>

        <section class="card">
          <div class="label-row"><span class="label">Giọng đọc</span></div>
          <div class="pills">
            <button type="button" class="pill ${activeVoice === "edge:vi-VN-NamMinhNeural" ? "active" : ""}">Nam</button>
            <button type="button" class="pill ${activeVoice === "edge:vi-VN-HoaiMyNeural" ? "active" : ""}">Nữ</button>
            <button type="button" class="pill ${activeVoice === "piper:adam_bua" ? "active" : ""}">Adam</button>
          </div>

          <label class="slider-row">
            <span class="label">Âm lượng gốc</span>
            <input type="range" min="0" max="100" value="${origVol}" />
            <span class="val">${origVol}%</span>
          </label>

          <label class="slider-row">
            <span class="label">Âm lượng Việt</span>
            <input type="range" min="0" max="160" value="${dubVol}" />
            <span class="val">${dubVol}%</span>
          </label>

          <label class="slider-row">
            <span class="label">Tốc độ đọc</span>
            <input type="range" min="0.9" max="1.4" step="0.05" value="${speed}" />
            <span class="val">${speed}×</span>
          </label>
        </section>

        <section class="card toggles">
          <label class="check-row"><span>Hiện phụ đề tiếng Việt trên video</span><input type="checkbox" checked /></label>
          <label class="check-row"><span>Phụ đề song ngữ (kèm câu gốc)</span><input type="checkbox" ${showOrig ? "checked" : ""} /></label>
          <label class="check-row"><span>Tự bật khi chuyển video YouTube kế tiếp</span><input type="checkbox" checked /></label>
        </section>

        <section class="card">
          <div class="row-between">
            <span class="label">Video không có phụ đề sẵn?</span>
            <button type="button" class="btn-sm">Nạp .SRT / .VTT</button>
          </div>
        </section>

        <div class="card">
          <div class="summary">▸ Tài khoản HalloVN</div>
        </div>
      </div>
    </div>
  `;
}

const BASE_STYLES = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
    background: #090d16;
    color: #f8fafc;
    -webkit-font-smoothing: antialiased;
  }
  .canvas {
    position: relative;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(900px 520px at 14% 0%, rgba(225, 29, 72, 0.24), transparent 62%),
      radial-gradient(820px 520px at 90% 100%, rgba(56, 189, 248, 0.16), transparent 64%),
      linear-gradient(155deg, #0b1020 0%, #0f172a 55%, #090d16 100%);
    padding: 40px 56px 44px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .top-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .title-block h1 {
    margin: 0;
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.15;
    color: #ffffff;
  }
  .title-block h1 span {
    background: linear-gradient(90deg, #fb7185, #f43f5e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .title-block p {
    margin: 8px 0 0;
    font-size: 16px;
    color: #cbd5e1;
    font-weight: 450;
  }
  .brand-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
    flex-shrink: 0;
  }
  .brand-chip img {
    width: 26px;
    height: 26px;
    border-radius: 7px;
  }
  .browser-frame {
    border-radius: 18px;
    overflow: hidden;
    background: #0f0f0f;
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 28px 70px rgba(0, 0, 0, 0.62);
  }
  .chrome-bar {
    height: 40px;
    background: #1e222d;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 12px;
  }
  .traffic {
    display: flex;
    gap: 7px;
  }
  .traffic i {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    display: block;
  }
  .url-pill {
    flex: 1;
    max-width: 560px;
    height: 26px;
    border-radius: 999px;
    background: #11151f;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 8px;
    font-size: 12px;
    color: #94a3b8;
  }
  .ext-icons {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ext-pin {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: rgba(225, 29, 72, 0.2);
    border: 1px solid rgba(251, 113, 133, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ext-pin img {
    width: 18px;
    height: 18px;
    border-radius: 4px;
  }
  .popup-shell {
    width: 340px;
    background: #0f1219;
    color: #f1f5f9;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 26px 65px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(244, 63, 94, 0.18);
    overflow: hidden;
  }
  .popup-shell .wrap { font-size: 13px; }
  ${popupCss.replace(/^body\s*\{[\s\S]*?\}/m, "")}
  ${contentCss}
`;

// 1. Screenshot 1: YouTube 1-click VI dubbing + live bilingual captions + active VI button
const SCREENSHOT_1_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
  ${BASE_STYLES}
  .stage {
    position: relative;
    flex: 1;
    margin-top: 24px;
    display: flex;
    flex-direction: column;
  }
  .yt-player {
    position: relative;
    height: 556px;
    background:
      radial-gradient(560px 360px at 32% 38%, rgba(251, 191, 36, 0.22), transparent 64%),
      radial-gradient(640px 420px at 78% 28%, rgba(56, 189, 248, 0.20), transparent 65%),
      linear-gradient(180deg, #1b283f 0%, #162033 48%, #0c121e 100%);
    overflow: hidden;
  }
  .scene-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.92;
  }
  .channel-watermark {
    position: absolute;
    top: 22px;
    left: 26px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tv-logo {
    padding: 5px 10px;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.22);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.06em;
    color: #fff;
  }
  .dub-live-badge {
    position: absolute;
    top: 22px;
    right: 26px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(15, 18, 26, 0.86);
    border: 1px solid rgba(251, 113, 133, 0.45);
    backdrop-filter: blur(8px);
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  }
  .eq {
    display: inline-flex;
    align-items: flex-end;
    gap: 2.5px;
    height: 13px;
  }
  .eq span {
    width: 3px;
    border-radius: 2px;
    background: #fb7185;
    display: block;
  }
  .yt-controls {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 28px 18px 12px;
    background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.86) 65%);
  }
  .yt-scrubber {
    height: 4px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 999px;
    position: relative;
    margin-bottom: 12px;
  }
  .yt-scrubber-fill {
    width: 38%;
    height: 100%;
    background: #ff0033;
    border-radius: 999px;
    position: relative;
  }
  .yt-scrubber-fill::after {
    content: "";
    position: absolute;
    right: -6px;
    top: -4px;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: #ff0033;
  }
  .yt-bar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #fff;
    font-size: 13px;
  }
  .yt-left, .yt-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .yt-icon {
    opacity: 0.92;
    font-size: 15px;
    font-weight: 700;
  }
  .vi-ring {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .vi-callout {
    position: absolute;
    right: -12px;
    bottom: 46px;
    width: 236px;
    padding: 9px 13px;
    border-radius: 12px;
    background: linear-gradient(135deg, #e11d48, #be123c);
    color: #fff;
    font-size: 12.5px;
    font-weight: 700;
    line-height: 1.35;
    box-shadow: 0 14px 32px rgba(225, 29, 72, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.28);
    z-index: 10;
  }
  .vi-callout::after {
    content: "";
    position: absolute;
    right: 22px;
    bottom: -7px;
    width: 14px;
    height: 14px;
    background: #be123c;
    transform: rotate(45deg);
    border-right: 1px solid rgba(255, 255, 255, 0.28);
    border-bottom: 1px solid rgba(255, 255, 255, 0.28);
  }
  .hvn-dub-hud {
    display: flex !important;
    bottom: 148px;
  }
</style></head><body>
  <div class="canvas">
    <div class="top-header">
      <div class="title-block">
        <h1>Xem YouTube bằng <span>giọng thuyết minh tiếng Việt</span> chỉ 1 chạm</h1>
        <p>Tự động dịch phụ đề &amp; lồng tiếng Việt đồng bộ mượt ngay trong trình phát YouTube</p>
      </div>
      <div class="brand-chip"><img src="${icon128DataUri}" alt="" /> HalloVN Dub</div>
    </div>

    <div class="stage">
      <div class="browser-frame">
        <div class="chrome-bar">
          <div class="traffic">
            <i style="background:#ef4444"></i><i style="background:#f59e0b"></i><i style="background:#22c55e"></i>
          </div>
          <div class="url-pill">
            <span>🔒</span>
            <span>youtube.com/watch?v=deutschland-reportage</span>
          </div>
          <div class="ext-icons">
            <div class="ext-pin"><img src="${icon48DataUri}" alt="" /></div>
          </div>
        </div>

        <div class="yt-player">
          <svg class="scene-svg" viewBox="0 0 1168 556" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#1e3a5f"/>
                <stop offset="52%" stop-color="#2c4a6e"/>
                <stop offset="100%" stop-color="#0f172a"/>
              </linearGradient>
              <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#fde68a" stop-opacity="0.72"/>
                <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <rect width="1168" height="556" fill="url(#sky)"/>
            <circle cx="310" cy="190" r="190" fill="url(#sun)"/>
            <!-- Stylized Berlin Fernsehturm & European skyline silhouette -->
            <rect x="0" y="370" width="1168" height="186" fill="#0d1526"/>
            <path d="M0 370 L60 320 L140 320 L140 370 M160 370 L160 280 L250 280 L250 370 M280 370 L280 305 L380 305 L380 370 M410 370 L410 255 L495 255 L495 370 M640 370 L640 270 L740 270 L740 370 M765 370 L765 295 L880 295 L880 370 M910 370 L910 245 L1035 245 L1035 370 M1055 370 L1055 300 L1168 300 L1168 370 Z" fill="#152238"/>
            <!-- TV Tower -->
            <rect x="562" y="135" width="10" height="235" fill="#233754"/>
            <circle cx="567" cy="168" r="24" fill="#334d73"/>
            <circle cx="567" cy="168" r="18" fill="#1e293b"/>
            <rect x="565" y="72" width="4" height="72" fill="#94a3b8"/>
            <!-- Warm window lights -->
            <g fill="#fde68a" opacity="0.55">
              <rect x="180" y="300" width="10" height="14" rx="2"/><rect x="202" y="300" width="10" height="14" rx="2"/><rect x="224" y="300" width="10" height="14" rx="2"/>
              <rect x="180" y="326" width="10" height="14" rx="2"/><rect x="224" y="326" width="10" height="14" rx="2"/>
              <rect x="430" y="275" width="12" height="16" rx="2"/><rect x="454" y="275" width="12" height="16" rx="2"/>
              <rect x="430" y="305" width="12" height="16" rx="2"/><rect x="454" y="305" width="12" height="16" rx="2"/>
              <rect x="665" y="290" width="12" height="15" rx="2"/><rect x="690" y="290" width="12" height="15" rx="2"/><rect x="714" y="290" width="12" height="15" rx="2"/>
              <rect x="935" y="268" width="14" height="18" rx="2"/><rect x="962" y="268" width="14" height="18" rx="2"/><rect x="989" y="268" width="14" height="18" rx="2"/>
              <rect x="935" y="300" width="14" height="18" rx="2"/><rect x="989" y="300" width="14" height="18" rx="2"/>
            </g>
            <!-- Soft river reflection -->
            <ellipse cx="567" cy="435" rx="430" ry="38" fill="#38bdf8" opacity="0.08"/>
            <ellipse cx="320" cy="422" rx="180" ry="22" fill="#fbbf24" opacity="0.11"/>
          </svg>

          <div class="channel-watermark">
            <div class="tv-logo">DOKU · DE</div>
          </div>

          <div class="dub-live-badge">
            <span class="eq">
              <span style="height:6px"></span>
              <span style="height:13px"></span>
              <span style="height:9px"></span>
              <span style="height:12px"></span>
            </span>
            Đang thuyết minh · Giọng Nam · 1.15×
          </div>

          <div class="hvn-dub-hud">
            <div class="hvn-dub-caption">
              <div class="hvn-dub-vi">Hôm nay chúng ta cùng khám phá cuộc sống và công việc thường ngày tại Berlin.</div>
              <div class="hvn-dub-orig">Heute entdecken wir den Alltag und das Arbeitsleben in Berlin.</div>
            </div>
          </div>

          <div class="yt-controls">
            <div class="yt-scrubber"><div class="yt-scrubber-fill"></div></div>
            <div class="yt-bar-row">
              <div class="yt-left">
                <span class="yt-icon">❚❚</span>
                <span class="yt-icon">⏭</span>
                <span class="yt-icon">🔊</span>
                <span style="color:#e2e8f0;font-variant-numeric:tabular-nums">04:18 / 11:24</span>
              </div>
              <div class="yt-right">
                <div class="vi-ring">
                  <div class="vi-callout">Bấm nút <u>VI</u> ngay trên trình phát YouTube để bật/tắt thuyết minh!</div>
                  <div class="hvn-yt-btn hvn-active"><span class="hvn-yt-badge">VI</span></div>
                </div>
                <span class="yt-icon">CC</span>
                <span class="yt-icon">⚙</span>
                <span class="yt-icon">⛶</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;

// 2. Screenshot 2: 3 Vietnamese Voices (Nam, Nữ, Adam) + Real Popup Controls
const SCREENSHOT_2_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
  ${BASE_STYLES}
  .grid-two {
    flex: 1;
    display: grid;
    grid-template-columns: 1.12fr 0.88fr;
    gap: 48px;
    align-items: center;
    margin-top: 12px;
  }
  .left-col {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    align-self: flex-start;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(225, 29, 72, 0.16);
    border: 1px solid rgba(251, 113, 133, 0.42);
    color: #fda4af;
    font-size: 13px;
    font-weight: 700;
  }
  .hero-title {
    margin: 0;
    font-size: 42px;
    font-weight: 800;
    line-height: 1.14;
    letter-spacing: -0.025em;
  }
  .hero-title span {
    background: linear-gradient(90deg, #fb7185, #f43f5e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .hero-sub {
    margin: 0;
    font-size: 17px;
    line-height: 1.5;
    color: #cbd5e1;
  }
  .feat-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 4px;
  }
  .feat-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 15px 18px;
    border-radius: 14px;
    background: rgba(23, 28, 39, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.09);
  }
  .feat-ico {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(225, 29, 72, 0.16);
    border: 1px solid rgba(251, 113, 133, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .feat-card h3 {
    margin: 0 0 3px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  .feat-card p {
    margin: 0;
    font-size: 13.5px;
    color: #94a3b8;
    line-height: 1.4;
  }
  .right-col {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .popup-scale {
    transform: scale(1.24);
    transform-origin: center center;
  }
</style></head><body>
  <div class="canvas">
    <div class="grid-two">
      <div class="left-col">
        <div class="kicker">🎙️ Tuỳ chỉnh linh hoạt theo gu nghe</div>
        <h1 class="hero-title">3 giọng đọc tiếng Việt tự nhiên: <span>Nam · Nữ · Adam</span></h1>
        <p class="hero-sub">Chuyển đổi giọng đọc tức thì, cân chỉnh âm lượng tiếng gốc và tiếng Việt độc lập ngay khi video đang phát.</p>

        <div class="feat-list">
          <div class="feat-card">
            <div class="feat-ico">🎚️</div>
            <div>
              <h3>Tự động hạ nhỏ tiếng gốc (Auto-Ducking)</h3>
              <p>Giữ nguyên không khí video gốc ở mức nhẹ (10–25%) để giọng thuyết minh tiếng Việt nổi rõ, dễ nghe.</p>
            </div>
          </div>
          <div class="feat-card">
            <div class="feat-ico">⚡</div>
            <div>
              <h3>Đồng bộ mượt khi tua &amp; đổi tốc độ</h3>
              <p>Tự căn nhịp câu đọc theo từng khung hình; phát nhanh từng phần sau vài giây, không cần chờ dịch hết cả video dài.</p>
            </div>
          </div>
          <div class="feat-card">
            <div class="feat-ico">💬</div>
            <div>
              <h3>Phụ đề song ngữ Việt – Gốc</h3>
              <p>Bật thêm câu gốc ngay bên dưới phụ đề tiếng Việt để vừa xem giải trí vừa luyện nghe ngoại ngữ hiệu quả.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="right-col">
        <div class="popup-scale">
          ${buildPopupMarkup({ activeVoice: "piper:adam_bua", origVol: 15, dubVol: 115, speed: "1.15", showOrig: true })}
        </div>
      </div>
    </div>
  </div>
</body></html>`;

// 3. Screenshot 3: Works everywhere + Geo-blocked German channels + SRT/VTT + Privacy
const SCREENSHOT_3_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
  ${BASE_STYLES}
  .grid-main {
    flex: 1;
    display: grid;
    grid-template-columns: 1.16fr 0.84fr;
    gap: 32px;
    align-items: center;
    margin-top: 22px;
  }
  .mini-player {
    position: relative;
    height: 492px;
    border-radius: 16px;
    overflow: hidden;
    background: linear-gradient(150deg, #172554 0%, #1e293b 48%, #0f172a 100%);
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 26px 65px rgba(0, 0, 0, 0.58);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 22px;
  }
  .badges-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .site-pill {
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.16);
    font-size: 12.5px;
    font-weight: 700;
    color: #e2e8f0;
  }
  .site-pill.hi {
    background: rgba(225, 29, 72, 0.24);
    border-color: rgba(251, 113, 133, 0.5);
    color: #fecdd3;
  }
  .center-visual {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin: auto 0;
  }
  .wave-card {
    width: 100%;
    padding: 18px 20px;
    border-radius: 14px;
    background: rgba(10, 14, 24, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(8px);
  }
  .wave-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12.5px;
    color: #94a3b8;
    margin-bottom: 10px;
  }
  .wave-top strong { color: #86efac; }
  .hvn-dub-pill {
    width: 100%;
    max-width: 100%;
  }
  .side-cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .info-card {
    padding: 20px 22px;
    border-radius: 16px;
    background: rgba(23, 28, 39, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .info-card .tag {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
    margin-bottom: 10px;
    background: rgba(56, 189, 248, 0.14);
    color: #7dd3fc;
    border: 1px solid rgba(56, 189, 248, 0.3);
  }
  .info-card .tag.rose {
    background: rgba(225, 29, 72, 0.16);
    color: #fda4af;
    border-color: rgba(251, 113, 133, 0.35);
  }
  .info-card .tag.green {
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
    border-color: rgba(34, 197, 94, 0.3);
  }
  .info-card h3 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 800;
    color: #fff;
  }
  .info-card p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: #cbd5e1;
  }
</style></head><body>
  <div class="canvas">
    <div class="top-header">
      <div class="title-block">
        <h1>Hỗ trợ <span>video chặn vùng địa lý</span> &amp; nạp nhanh phụ đề .SRT / .VTT</h1>
        <p>Đọc phụ đề trực tiếp ngay trên trình duyệt — xem mượt cả đài truyền hình Đức &amp; các trang học trực tuyến</p>
      </div>
      <div class="brand-chip"><img src="${icon128DataUri}" alt="" /> hallovn.de</div>
    </div>

    <div class="grid-main">
      <div class="mini-player">
        <div class="badges-row">
          <span class="site-pill hi">YouTube · ARD / WDR / ZDF</span>
          <span class="site-pill">HTML5 &lt;track&gt;</span>
          <span class="site-pill">.SRT / .VTT</span>
        </div>

        <div class="center-visual">
          <div class="hvn-dub-pill">
            <div class="hvn-dub-row">
              <span class="hvn-dub-dot"></span>
              <span>Đang đồng bộ giọng đọc tiếng Việt…</span>
              <span class="hvn-dub-pct">100%</span>
            </div>
            <div class="hvn-dub-bar"><div class="hvn-dub-fill" style="width:100%"></div></div>
          </div>

          <div class="wave-card">
            <div class="wave-top">
              <span>Phụ đề đọc trực tiếp từ trình phát</span>
              <strong>● Đã sẵn sàng</strong>
            </div>
            <div class="hvn-dub-caption" style="background:rgba(15,23,42,0.9);border:1px solid rgba(255,255,255,0.1)">
              <div class="hvn-dub-vi" style="font-size:18px">Đây là một kênh phân phối mới giúp tiết kiệm rất nhiều thời gian.</div>
              <div class="hvn-dub-orig" style="font-size:14px">Das ist ein weiterer Vertriebskanal, der sehr viel Zeit spart.</div>
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:#94a3b8">
          <span>🔒 Không quảng cáo · Không lưu lịch sử duyệt web</span>
          <span style="color:#fda4af;font-weight:700">HalloVN Extension</span>
        </div>
      </div>

      <div class="side-cards">
        <div class="info-card">
          <span class="tag rose">Trực tiếp trên trình duyệt</span>
          <h3>Xem mượt video giới hạn quốc gia</h3>
          <p>Lấy phụ đề trực tiếp từ trình phát YouTube của bạn (kèm phiên địa phương), vượt lỗi chặn vùng ở các kênh Đức như ARD, WDR, ZDF, BR…</p>
        </div>
        <div class="info-card">
          <span class="tag">Mọi trang web có video</span>
          <h3>Đọc &lt;track&gt; &amp; nạp file .SRT / .VTT</h3>
          <p>Bấm biểu tượng HalloVN trên bất kỳ trang học trực tuyến hay trình phát HTML5 nào để tự đọc phụ đề sẵn có hoặc chọn file phụ đề từ máy.</p>
        </div>
        <div class="info-card">
          <span class="tag green">An toàn &amp; riêng tư</span>
          <h3>Quyền tối giản chuẩn Chrome Store</h3>
          <p>Chỉ hoạt động khi bạn kích hoạt thuyết minh, không xin quyền đọc toàn bộ trang web, không chèn quảng cáo hay theo dõi người dùng.</p>
        </div>
      </div>
    </div>
  </div>
</body></html>`;

// 4. Small Promo Tile (440x280)
const PROMO_SMALL_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 440px;
    height: 280px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
    color: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .tile {
    width: 440px;
    height: 280px;
    padding: 24px 26px;
    background:
      radial-gradient(320px 240px at 88% 12%, rgba(244, 63, 94, 0.42), transparent 65%),
      radial-gradient(280px 220px at 8% 95%, rgba(56, 189, 248, 0.22), transparent 65%),
      linear-gradient(145deg, #0b1020 0%, #151c31 55%, #090d16 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-row img {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
  }
  .brand-name {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .brand-sub {
    font-size: 11.5px;
    color: #94a3b8;
    margin-top: 2px;
  }
  .vi-badge {
    padding: 5px 12px;
    border-radius: 8px;
    background: #e11d48;
    border: 1px solid #fb7185;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.04em;
    box-shadow: 0 0 18px rgba(225, 29, 72, 0.6);
  }
  .mid h1 {
    margin: 0;
    font-size: 25px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .mid h1 span {
    color: #fb7185;
  }
  .mid p {
    margin: 8px 0 0;
    font-size: 13px;
    color: #cbd5e1;
    line-height: 1.4;
  }
  .bottom {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .chip {
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 11.5px;
    font-weight: 700;
    color: #f1f5f9;
  }
</style></head><body>
  <div class="tile">
    <div class="top">
      <div class="logo-row">
        <img src="${icon128DataUri}" alt="HalloVN" />
        <div>
          <div class="brand-name">HalloVN</div>
          <div class="brand-sub">hallovn.de</div>
        </div>
      </div>
      <div class="vi-badge">VI</div>
    </div>

    <div class="mid">
      <h1>Thuyết minh <span>tiếng Việt</span> cho YouTube &amp; Video</h1>
      <p>Xem video ngoại ngữ dễ hiểu ngay trên Chrome, đồng bộ mượt từng câu.</p>
    </div>

    <div class="bottom">
      <span class="chip">🎙️ Nam · Nữ · Adam</span>
      <span class="chip">💬 Phụ đề song ngữ</span>
    </div>
  </div>
</body></html>`;

async function renderPng(browser, html, width, height, outPath) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: outPath, type: "png", omitBackground: false });
  await page.close();
  const stat = fs.statSync(outPath);
  console.log(`Generated ${path.relative(ROOT, outPath)} (${width}x${height}, ${(stat.size / 1024).toFixed(1)} KB)`);
}

let browser;
try {
  browser = await chromium.launch({ channel: "chrome" });
} catch {
  browser = await chromium.launch();
}
try {
  await renderPng(browser, SCREENSHOT_1_HTML, 1280, 800, path.join(OUT_DIR, "screenshot-1-youtube-dub.png"));
  await renderPng(browser, SCREENSHOT_2_HTML, 1280, 800, path.join(OUT_DIR, "screenshot-2-voices-controls.png"));
  await renderPng(browser, SCREENSHOT_3_HTML, 1280, 800, path.join(OUT_DIR, "screenshot-3-bilingual-srt.png"));
  await renderPng(browser, PROMO_SMALL_HTML, 440, 280, path.join(OUT_DIR, "promo-small-440x280.png"));
} finally {
  await browser.close();
}
