# HalloVN · Đặc tả Đồng bộ Thiết kế iOS (`mobile/`)

> **Trạng thái:** Web đã hoàn tất chuyển sang hệ thiết kế **Tối giản & Chuyên nghiệp** (xem `DESIGN.md`, `src/app/(app)/globals.css`). Thư mục `mobile/` được giữ nguyên để không ảnh hưởng bản phát hành App Store hiện tại.  
> **Mục đích tài liệu:** Làm đặc tả ánh xạ 1-1 để đồng bộ app iOS React Native/Expo trong bản cập nhật tiếp theo mà vẫn tôn trọng **Apple Human Interface Guidelines (HIG)**.

---

## 1. Bảng ánh xạ Token màu (`mobile/src/lib/theme.ts`)

Thay thế cặp `LIGHT` và `DARK` hiện tại của hệ *"Nhãn vở"* bằng bảng màu trung tính sắc nét mới (giữ nguyên tên khóa để không vỡ các màn hiện có):

### Light Palette (`LIGHT`)
| Khóa (`C.*`) | Cũ ("Nhãn vở") | Mới (Minimalist) | Ghi chú |
|---|---|---|---|
| `background` | `#fbfaf7` | `#f8fafc` | Nền trang trung tính sạch |
| `card` | `#ffffff` | `#ffffff` | Bề mặt thẻ chính |
| `card2` | `#f3f1ea` | `#f1f5f9` | Bề mặt phụ / grouped surface |
| `bar` | `#ffffff` | `#ffffff` | Thanh điều hướng |
| `border` | `#e3e0d7` | `#cbd5e1` | Viền control / input / button |
| `line` | `#ebe8e0` | `#e2e8f0` | Viền thẻ & kẻ phân cách hàng (`1px` / hairline) |
| `ink` / `inkLine` / `text` | `#16203a` | `#0f172a` | Chữ chính |
| `muted` | `#5a6175` | `#475569` | Chữ phụ (tương phản > 6.5:1) |
| `accent` / `accentDark` / `accentText` | `#2a4fe0` / `#1d3bb8` | `#2563eb` / `#1d4ed8` | Hành động chính & khu **Tiếng Đức** |
| `accentSoft` | `#e8edff` | `#eff6ff` | Nền nhấn nhẹ |
| `link` | `#1d3bb8` | `#1d4ed8` | Liên kết |
| `gold` / `goldDark` / `goldSoft` / `amber` | `#ffc93a` / `#e0a300` / `#fff4d2` / `#8a5b00` | `#f59e0b` / `#d97706` / `#fef3c7` / `#92400e` | Khu **Lái xe** & chuỗi ngày |
| `onAmber` | `#16203a` | `#0f172a` | Chữ trên nền vàng |
| `coral` / `coralDark` / `coralSoft` / `coralText` | `#ff6b55` / `#d9452f` / `#ffe9e4` / `#b5311b` | `#ea580c` / `#c2410c` / `#fff7ed` / `#c2410c` | Khu **Leben in Deutschland** & ghi âm |
| `grape` / `grapeDark` / `grapeSoft` / `grapeText` | `#6a4ae0` / `#4f33bd` / `#efeaff` / `#5236c4` | `#4f46e5` / `#4338ca` / `#eef2ff` / `#4338ca` | Khu **Trò chơi** |
| `ok` / `okSoft` / `okText` | `#1a7f45` / `#e3f5ea` / `#136136` | `#16a34a` / `#f0fdf4` / `#15803d` | **Chỉ dùng cho Đúng / Hoàn thành / Đậu** |
| `red` / `redText` / `redSoft` | `#d92d35` / `#c4242b` / `#fde7e7` | `#dc2626` / `#b91c1c` / `#fef2f2` | Sai / Xóa / Đang ghi âm |
| `gem` / `gemFill` / `gemDark` / `gemSoft` / `phrase` | `#0b7aa6` / `#075a7b` / `#e1f3fa` | `#0284c7` / `#0284c7` / `#0369a1` / `#f0f9ff` / `#0284c7` | Kim cương & cụm từ |
| `aqua` / `candy` / `sun` / `leaf` | `#b9ccff` / `#ffb4a8` / `#ffe08a` / `#a6e6be` | `#dbeafe` / `#ffedd5` / `#fef3c7` / `#dcfce7` | Bước học transcript |

### Dark Palette (`DARK`)
| Khóa (`C.*`) | Cũ | Mới (Minimalist) |
|---|---|---|
| `background` | `#0e1424` | `#0b0d12` |
| `card` | `#151c2f` | `#12151e` |
| `card2` | `#1c2540` | `#1a1f2c` |
| `bar` | `#0b101d` | `#0f1219` |
| `border` | `#2a3552` | `#2a3144` |
| `line` | `#222c45` | `#1e2433` |
| `ink` / `inkLine` / `text` | `#e9edf7` | `#f1f5f9` |
| `muted` | `#a3adc6` | `#94a3b8` |
| `accent` / `accentDark` / `accentText` / `accentSoft` | `#3d5ef0` / `#2c48c9` / `#8ea6ff` / `#1c2a5c` | `#3b82f6` / `#2563eb` / `#60a5fa` / `#15223d` |
| `gold` / `goldDark` / `goldSoft` / `amber` | `#ffd36a` / `#c99a1e` / `#3a3017` / `#ffd36a` | `#fbbf24` / `#d97706` / `#2b210d` / `#fcd34d` |
| `coral` / `coralDark` / `coralSoft` / `coralText` | `#ff8f7e` / `#d9654f` / `#3f2420` / `#ffa596` | `#fb923c` / `#ea580c` / `#2c1a10` / `#fdba74` |
| `grape` / `grapeDark` / `grapeSoft` / `grapeText` | `#8f74ff` / `#6a4ae0` / `#2a2350` / `#bfaeff` | `#818cf8` / `#6366f1` / `#1c1e3d` / `#a5b4fc` |
| `ok` / `okSoft` / `okText` | `#2f9e5e` / `#173326` / `#6fdc9c` | `#22c55e` / `#0e2619` / `#4ade80` |
| `red` / `redText` / `redSoft` | `#e5484d` / `#ff8a8f` / `#3a1c22` | `#ef4444` / `#f87171` / `#2d1418` |
| `gem` / `gemFill` / `gemDark` / `gemSoft` / `phrase` | `#7fd3f0` / `#2f86a8` / `#13304a` | `#38bdf8` / `#0284c7` / `#0d2233` / `#0d2233` / `#38bdf8` |
| `aqua` / `candy` / `sun` / `leaf` | `#2c3f80` / `#8a4a42` / `#6b5520` / `#245c3d` | `#172544` / `#331e14` / `#302510` / `#112b1d` |

### Bo góc (`R`), Bóng (`FLOAT`), Khu vực (`SEC`) & `NIGHT`
- `R`: `{ sm: 6, md: 10, lg: 14, xl: 18 }` (giảm từ `8/12/16/24` xuống gọn, sắc nét hơn).
- `SEC`:
  - `laixe`: Light `{ sec: C.goldDark, onSec: "#ffffff" }`, Dark `{ sec: C.gold, onSec: "#0b0d12" }`.
  - `lid`: Light `{ sec: C.coral, onSec: "#ffffff" }`, Dark `{ sec: C.coral, onSec: "#0b0d12" }`.
  - `ink`: Light `{ sec: "#334155", secDark: "#1e293b" }`, Dark `{ sec: "#475569", secDark: "#334155" }`.
- `NIGHT_BASE`: đồng bộ `background: "#0b0d12"`, `card: "#12151e"`, `card2: "#1a1f2c"`, `border: "#2a3144"`, `text: "#f1f5f9"`, `muted: "#94a3b8"`, `accent: "#6366f1"`, `accentDark: "#4f46e5"`.

---

## 2. Typography (`mobile/src/components/Text.tsx` & `mobile/package.json`)

- **Lựa chọn khuyến nghị (đồng bộ hoàn toàn với Web):** Cài `@expo-google-fonts/plus-jakarta-sans` và dùng thống nhất cho cả UI lẫn tiêu đề (weight `400`, `500`, `600`, `700`), giữ `MAX_SCALE = 1.6` cho Dynamic Type, đảm bảo `lineHeight` tiêu đề ≥ `1.22× fontSize` để không cắt dấu chồng tiếng Việt (`ệ`, `ồ`, `ử`, `ẫ`).
- **Hoặc tùy chọn native iOS nhẹ hơn:** Giữ hệ thống SF Pro (`System`) cho thân chữ nếu muốn giảm kích thước bundle app, chỉ dùng `Plus Jakarta Sans` cho tiêu đề lớn.

---

## 3. Đồng bộ Thành phần UI (Tôn trọng iOS HIG)

| Thành phần Web mới | Tương đương trong `mobile/src/components/` | Quy tắc chuyển đổi Native iOS |
|---|---|---|
| `<PageHeader>` tối giản (không bìa vở/nhãn chồng) | `PageHeader` trong `ui.tsx` + các tab `(tabs)/index.tsx`, `laixe.tsx`, `lid.tsx` | **Gỡ `<Cover>` + `<Nhan>` + gáy băng dính.** Dùng Large Navigation Title native của iOS hoặc header phẳng gồm ô icon `36–40pt` (`secSoft`), tiêu đề, mô tả ngắn và `QuizProgress` ngay phía dưới. |
| Dashboard Lái xe vs LiD tách biệt | `(tabs)/laixe.tsx`, `(tabs)/lid.tsx` | **Lái xe:** thẻ cấu trúc hạng + thanh tách `Grundstoff / Zusatzstoff` + lối tắt `Musterbögen`. **LiD:** thẻ Bang kèm `Wappen` nổi bật + nút 1 chạm vào `10 câu bang`. |
| `<BigCard>` phẳng (không cuốn vở) | Thẻ Học / Thi thử trong `QuizParts` | Card phẳng `borderWidth: 1`, `borderColor: C.line`, `borderRadius: R.lg`; thẻ chính dùng nền tint nhẹ `secSoft` + viền `alpha(sec, 0.35)`. |
| `<DeckCover>` phẳng 16:10 có vạch màu trên | Bìa bộ từ ở `vocab.tsx` | Bỏ tờ giấy lót lệch góc, bỏ nhãn viền đôi; giữ khung `borderRadius: R.md` + thanh `3pt` màu nhóm trình độ ở đỉnh. |
| `<AuthForm>` 1 cột tối giản | Màn đăng nhập / đăng ký | Gỡ nửa bìa vở & bong bóng thoại; giữ nút Sign in with Apple chuẩn HIG (đen trên sáng, trắng trên tối). |
| Linh vật tắc kè (`Mascot`) | EmptyState, Loading, Error, trang tổng quan | Giữ nguyên, xuất hiện tiết chế; **không** đặt trên từng thẻ danh sách. |
| Điều hướng & Phản hồi | `NativeTabs`, `Alert`, `ActionSheet`, `haptic` | **Giữ nguyên 100%** thanh tab Liquid Glass native, `presentation: "modal"`, Haptics (`tap`, `select`, `success`, `error`, `firm`). |
| Màn thi Lái xe & Game | `quiz/run.tsx`, `FallingWords` | **Giữ nguyên** giao diện mô phỏng phần mềm thi thật cho Lái xe và nền tối cho Game, chỉ cập nhật token màu & bo góc. |

---

## 4. Quy trình triển khai cho iOS (khi sẵn sàng bản cập nhật App Store tiếp theo)

1. Cập nhật `mobile/src/lib/theme.ts` (`LIGHT`, `DARK`, `SEC`, `R`, `NIGHT_BASE`, `LEVEL_COLORS`).
2. Cập nhật `mobile/src/components/ui.tsx` (`PageHeader`, `Card`, `Button`, `Segmented` — gỡ `Nhan` / `CoverTag` / gáy bìa).
3. Cập nhật 2 màn dashboard `(tabs)/laixe.tsx` và `(tabs)/lid.tsx` để tách biệt như Web.
4. Cập nhật `mobile/scripts/make-icons.mjs` nếu muốn đổi icon app khớp dấu thương hiệu mới (tùy chọn).
5. Kiểm tra trên iOS Simulator ở cả Light/Dark mode và Dynamic Type `1.0×` → `1.6×`.
