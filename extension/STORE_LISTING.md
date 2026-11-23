# Hướng dẫn nộp HalloVN Extension lên Chrome Web Store

File đóng gói chuẩn Store được tạo bằng lệnh:

```bash
npm run pack:ext
```

Kết quả nằm tại: `dist/hallovn-extension-v1.0.0.zip` (chỉ chứa file chạy thực tế, đã bỏ `README.md`, `STORE_LISTING.md` và `localhost`).

---

## 1. Thông tin trang cửa hàng (Store Listing)

- **Tên tiện ích (Name):** `HalloVN — Thuyết minh tiếng Việt cho Video`
- **Mô tả ngắn (Summary — tối đa 132 ký tự):**
  `Xem video YouTube và trang web có phụ đề với giọng thuyết minh tiếng Việt tự nhiên (Nam, Nữ, Adam), đồng bộ trực tiếp.`
- **Danh mục (Category):** `Accessibility` hoặc `Education` (khuyên dùng `Education` hoặc `Tools`)
- **Ngôn ngữ chính:** `Vietnamese (Tiếng Việt)`
- **Trang web chính thức (Homepage URL):** `https://hallovn.de/thuyet-minh`
- **Trang hỗ trợ (Support URL):** `https://hallovn.de/support`
- **Chính sách bảo mật (Privacy Policy URL):** `https://hallovn.de/privacy#extension`

### Mô tả chi tiết (Description)

```text
HalloVN giúp bạn xem video tiếng nước ngoài (Đức, Anh, Pháp, Nhật, Hàn…) với giọng thuyết minh tiếng Việt tự nhiên và phụ đề song ngữ ngay trên trình duyệt, không cần chuyển tab.

TÍNH NĂNG CHÍNH:
• Nút "VI" tích hợp thẳng trên thanh điều khiển trình phát YouTube — bấm 1 chạm là nghe thuyết minh tiếng Việt ngay.
• 3 giọng đọc tiếng Việt rõ ràng: Nam (Nam Minh), Nữ (Hoài My) và Adam (giọng tự nhiên).
• Tự động hạ nhỏ tiếng gốc (ducking) và giữ đồng bộ mượt khi bạn tua, tạm dừng hoặc đổi tốc độ video.
• Hỗ trợ phụ đề tiếng Việt & phụ đề song ngữ (kèm câu gốc) ngay trên video.
• Hỗ trợ cả video giới hạn vùng địa lý (như ARD, WDR, ZDF…) bằng cách đọc phụ đề trực tiếp từ trình phát trên máy bạn.
• Hỗ trợ video trên các trang web khác có phụ đề HTML5 (<track>), hoặc nạp trực tiếp file phụ đề .SRT / .VTT.
• Không quảng cáo, không theo dõi lịch sử duyệt web.

CÁCH SỬ DỤNG:
1. Mở một video YouTube bất kỳ và bấm nút "VI" ở góc dưới trình phát (hoặc bấm biểu tượng HalloVN trên thanh tiện ích).
2. Chọn giọng đọc (Nam / Nữ / Adam), chỉnh âm lượng gốc, âm lượng Việt và tốc độ đọc theo ý muốn.
3. (Tuỳ chọn) Đăng nhập tài khoản HalloVN miễn phí để mở thêm lượt xem mới mỗi ngày và hỗ trợ tạo phụ đề bằng AI cho video chưa có CC.
```

---

## 2. Mục Privacy Practices (điền đúng như sau để duyệt nhanh)

### Single Purpose (Mục đích duy nhất)
```text
Translate video subtitles and play synchronized Vietnamese voice-over dubbing directly on YouTube and user-activated web video pages.
```

### Permission Justifications (Giải trình từng quyền)

- **`storage`**:
  ```text
  Stores the user's dubbing preferences (selected Vietnamese voice, playback speed, original/dub volume levels, caption display options) in chrome.storage.sync, and optionally stores the HalloVN authentication token in chrome.storage.local when the user signs in.
  ```
- **`activeTab`**:
  ```text
  Allows the user to explicitly activate Vietnamese dubbing on a non-YouTube webpage containing an HTML5 video when they click the HalloVN toolbar icon, without requiring broad access to all websites.
  ```
- **`scripting`**:
  ```text
  Injects the dubbing overlay (content.js and content.css) on demand into the active tab only after the user clicks the extension icon on a non-YouTube webpage.
  ```
- **`host_permissions` (`https://hallovn.de/*`)**:
  ```text
  Communicates exclusively with the HalloVN backend API (hallovn.de) to translate subtitle cues into Vietnamese, synthesize Vietnamese voice-over audio, and authenticate optional user accounts.
  ```
- **Are you using remote code?** → Chọn **No, I am not using Remote code**.

### Data Usage (Khai báo dữ liệu)
Tích chọn **2 mục**:
- **Website content** *(chỉ đọc phụ đề của video mà người dùng chủ động bấm bật thuyết minh)*
- **Authentication information** *(chỉ khi người dùng tự đăng nhập tài khoản HalloVN trong popup)*

Không tích lịch sử duyệt web, vị trí, sức khỏe, tài chính… và tích đầy đủ 3 cam kết Limited Use (không bán dữ liệu, chỉ dùng cho tính năng cốt lõi, không dùng cho quảng cáo/tín dụng).

---

## 3. Tài sản đồ họa cần tải lên Dev Console

- **Store icon:** `extension/icons/icon128.png` (128×128 px — đã có sẵn)
- **Screenshots (1–5 ảnh):** Chụp màn hình `1280×800` (hoặc `640×400`) khi đang xem YouTube có nút `VI`, phụ đề tiếng Việt trên video và popup mở chọn giọng `Nam / Nữ / Adam`.
- **Small promo tile:** `440×280` px (PNG/JPEG, không trong suốt).

## 4. Các bước tải lên

1. Đăng ký tài khoản **Chrome Web Store Developer** tại https://chrome.google.com/webstore/devconsole (phí 1 lần $5).
2. Vào **Items → New Item** → tải lên `dist/hallovn-extension-v1.0.0.zip`.
3. Điền các mục **Store listing**, **Privacy practices**, tải ảnh chụp màn hình.
4. Chọn **Public** (công khai cho mọi người tải) hoặc **Unlisted** (chỉ ai có link mới cài được) → bấm **Submit for review**.
