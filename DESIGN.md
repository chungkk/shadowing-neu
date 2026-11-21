# HalloVN · Design System (Minimalist & Professional)

Phong cách: **Tối giản, sắc nét, tập trung nội dung** (cảm hứng Linear · Notion · Babbel).  
Người dùng là người Việt đang học tiếng Đức, ôn thi bằng lái (Führerschein) và ôn thi nhập tịch (Leben in Deutschland) — phần lớn học trên điện thoại trong các phiên ngắn. Giao diện lùi lại phía sau để câu chữ, audio, hình ảnh câu hỏi và tiến độ học là nhân vật chính.

Code thật: `src/app/(app)/globals.css` (token + primitive), `src/components/PageHeader.tsx` (đầu trang chuẩn), `src/components/Sidebar.tsx` (điều hướng).

---

## 1. Hệ màu

Mặc định giao diện **Sáng** (nền `#F8FAFC`, bề mặt `#FFFFFF`, mực `#0F172A`, viền `#E2E8F0`).  
Chế độ **Tối** (`[data-theme="dark"]`, đổi qua `ThemeToggle`; tạm khoá luôn tối bằng `FORCE_DARK` trong `src/lib/theme.ts`): nền than `#090B10`, card `#13171F`, card-2 `#1C212D`, lớp nổi `--raised` `#191E29`, chữ `#F1F5F9`, đường kẻ `#232A39`, viền ô điều khiển `#353E53`. Cùng hệ tên token.

Nguyên tắc tối:
- **Phân tầng bằng độ sáng, không bằng bóng:** nền → card → card-2 / `--raised` mỗi bậc sáng hơn rõ; card có mép trên hắt sáng `inset 0 1px 0 rgb(255 255 255 / .035)`; card bấm được sáng lên 3% khi hover.
- **Lớp nổi** (`.popover`, `.dialog`) dùng `--raised` thay cho `--card`.
- **Ô nhập lõm xuống:** nền `.input` / `.input-group` trộn 55% `--background` vào `--card`.
- **Màu nhấn sáng cho chữ/viền, bậc `-dark` cho mảng nền dưới chữ trắng:** `.btn-primary`, `.btn-red`, `.btn-record`, `.btn-recording` dùng `--accent-dark` / `--red-dark` / `--coral-dark` để chữ trắng đạt ≥ 4.5:1.

| Vai trò | Token | Sáng | Tối | Dùng cho |
|---|---|---|---|---|
| Hành động chính / Thương hiệu | `--accent` · `-dark` · `-soft` · `-text` | `#2563EB` | `#3B82F6` | nút chính (tối đa 1/màn), link, focus, khu **Tiếng Đức** |
| Khu Lái xe / Cảnh báo nhẹ | `--gold` · `-dark` · `-soft` · `--amber` | `#F59E0B` / `#92400E` | `#FBBF24` / `#FCD34D` | khu **Lái xe**, chuỗi ngày, điểm nhấn |
| Khu LiD / Ghi âm | `--coral` · `-dark` · `-soft` · `-text` | `#EA580C` / `#C2410C` | `#FB923C` / `#FDBA74` | khu **Leben in Deutschland**, nút ghi âm |
| Tím chàm | `--grape` · `-dark` · `-soft` · `-text` | `#4F46E5` / `#4338CA` | `#818CF8` / `#A5B4FC` | nhãn trình độ C |
| Đúng / Thành công | `--ok` · `-dark` · `-soft` · `-text` | `#16A34A` / `#15803D` | `#22C55E` / `#4ADE80` | **chỉ dùng cho đúng / hoàn thành / đậu** — không dùng làm màu khu vực hay nút chính |
| Sai / Xóa / Đang ghi âm | `--red` · `-dark` · `-soft` · `--red-400` | `#DC2626` / `#B91C1C` | `#EF4444` / `#F87171` | câu sai, xóa, lỗi, đang ghi âm |
| Kim cương | `--gem` · `-dark` · `-soft` | `#0284C7` | `#38BDF8` | điểm kiếm được khi học |
| Bước học transcript | `--aqua` nghe · `--candy` nói · `--sun` chép · `--leaf` đúng | pastel nhẹ | nền tối dịu | câu đang học trong `ShadowPlayer` |

### Màu nhận diện khu vực (`data-sec`)
Đặt `data-sec="de|laixe|lid|ink"` trên khung trang/khu vực để cấp `--sec`, `--sec-dark`, `--sec-soft`, `--sec-text`, `--on-sec`.  
Nguyên tắc tối giản: **dùng màu khu vực tiết chế** (icon tint, gạch chân tab active, thanh tiến độ, badge nhỏ) — không tô mảng nền chói cả màn hình.

---

## 2. Typography

- **UI & Tiêu đề:** **Plus Jakarta Sans** (`--font-body`, `subsets: ["latin", "vietnamese"]`, weight `400–800`) — hiển thị sắc nét dấu chồng tiếng Việt (`ệ, ồ, ử, ẫ`) và ký tự Đức (`ä, ö, ü, ß`).
- **Số liệu / Chính tả / Mã:** **Geist Mono** (`--font-geist-mono`) + `tabular-nums` cho điểm số, thời gian, tiến độ.
- **Khoảng dòng tiêu đề:** luôn ≥ `1.2` để không cắt dấu tiếng Việt.
- **Thang chữ:**
  - `.display`: tiêu đề chính trang chủ (`clamp(2.1rem, 1.3rem + 3vw, 3.5rem)`, weight `800`, tracking `-0.03em`)
  - `.page-title` (`h1`): tiêu đề trang (`clamp(1.5rem, 1.2rem + 1.2vw, 2rem)`, weight `700`, tracking `-0.025em`)
  - `.section-title` (`h2`): tiêu đề mục (`1.125rem–1.375rem`, weight `700`, tracking `-0.015em`)
  - `.label`: nhãn nhóm nhỏ in hoa (`11–12px`, tracking `0.06em`, `text-muted`)

---

## 3. Bề mặt, Khoảng cách & Chiều sâu

- **Phẳng & sắc nét:** `.card`, `.tile` = nền `--card` + viền `1px solid var(--line)`. Bo góc gọn: `--radius-sm` (`6px`), `--radius` (`10px`), `--radius-lg` (`14px`), `--radius-xl` (`18px`).
- **Không lồng card trong card:** Danh sách dài dùng `divide-y divide-line`; nhóm phụ dùng `.surface` (`--card-2`).
- **Bóng đổ có kỷ luật:** Chỉ dùng `--shadow-sm/md/lg` cho lớp nổi thật sự (`.popover`, `.dialog`, `.toast`) và hover nhẹ trên thẻ bấm được (`.card-link`).
- **Linh vật (`Mascot`):** Giữ làm điểm nhấn thân thiện ở logo, trang chủ, empty state, loading và error — không rải dày đặc.

---

## 4. Thành phần chuẩn

- **Đầu trang (`<PageHeader>`):** Bố cục ngang tối giản kiểu Linear/Notion (icon khu vực nhỏ + tiêu đề `h1` + mô tả ngắn + metadata/actions bên phải + slot `children` cho tiến độ/chip), có đường kẻ đáy `border-b border-line`. Màn làm bài / màn học / màn chơi không dùng `PageHeader`.
- **Nút (`.btn`):** trung tính (`--card` + viền `--border`), `.btn-primary` (xanh lam), `.btn-soft`, `.btn-ghost`, `.btn-amber`, `.btn-red`, `.btn-record`/`.btn-recording`, `.btn-icon`; cỡ `.btn-sm` (`32px`), mặc định (`40px`), `.btn-lg` (`46–48px`), `.btn-block`.
- **Điều hướng:** Header desktop sticky (`backdrop-blur`), tab sạch có gạch chân/pill nhẹ; mobile bottom nav tối đa 4–5 mục, vùng chạm ≥ `44px` (`.hit-44`), tự ẩn trong màn học (`.lesson`).
- **Form, Tabs, Chips, Badges, Table, Progress, Dialog, Popover, Toast, Alert, Empty, Skeleton:** Dùng thống nhất qua các primitive trong `globals.css`.

---

## 5. Màn đặc biệt được bảo toàn

- **Màn đặc biệt được bảo toàn:**
  - **`.theme-fahrschule`** (màn câu hỏi & thi thử Lái xe): giữ giao diện sáng, rõ, mô phỏng phần mềm thi lý thuyết thật (luôn sáng kể cả khi bật Dark mode), đồng bộ font và bo góc với hệ mới.
- **Chủ đề mùa Noel (`SEASONAL_THEME = "noel"` trong `src/lib/theme.ts`, CSS tại `src/app/(app)/styles/noel.css`, hiệu ứng tại `src/components/NoelAtmosphere.tsx`):**
  - Ưu tiên tối đa tông **đen – trắng** trên nền tối (`#060607` → `#101012` → `#17171A`, chữ trắng tuyết `#FAF8F4`, nút chính trắng chữ đen qua `--on-accent`).
  - Ánh đèn chiếu ấm áp từ trên xuống (spotlight beams toàn trang, vùng Hero và đầu trang con), dây đèn nhỏ dịu mắt dọc mép header và tuyết rơi chậm rất nhẹ (tự ẩn khi `prefers-reduced-motion: reduce` hoặc trong `.theme-fahrschule`).

---

## 6. Ứng dụng iOS (`mobile/`)

Bản Web được triển khai trước để giữ ổn định bản App Store hiện tại. Khi hoàn tất Web (Phase 6), bảng ánh xạ chi tiết giữa token/component Web mới và `mobile/src/lib/theme.ts`, `mobile/src/components/ui.tsx` sẽ được ghi tại `docs/ios-design-sync.md`.
