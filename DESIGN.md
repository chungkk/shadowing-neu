# HalloVN · Design System (Modern Dark EdTech)

Phong cách: **Hiện đại, thân thiện, giáo dục và tinh gọn** (kết hợp sự thân thiện của Duolingo, tính rõ ràng của Babbel và độ tinh xảo của Linear).  
Người dùng là người Việt đang học tiếng Đức, ôn thi bằng lái (Führerschein) và ôn thi nhập tịch (Leben in Deutschland) — phần lớn học trên điện thoại hoặc laptop trong các phiên dài. Giao diện tối mặc định giúp giảm mỏi mắt để câu chữ, audio, hình ảnh câu hỏi và tiến độ học là nhân vật chính.

Code thật: `src/app/(app)/globals.css` (token + primitive), `src/components/PageHeader.tsx` (đầu trang chuẩn), `src/components/Sidebar.tsx` (điều hướng toàn cục & theo từng sản phẩm).

---

## 1. Hệ màu (Dark Mode First)

Mặc định giao diện **Tối** (`[data-theme="dark"]`, khoá qua `FORCE_DARK = true` trong `src/lib/theme.ts`), phân tầng bề mặt bằng màu nền và viền mảnh `#263241` thay vì bóng đổ nặng hay hiệu ứng phát sáng:

| Vai trò | Token | Giá trị | Dùng cho |
|---|---|---|---|
| Nền chính | `--background` | `#0B0F14` | nền toàn trang |
| Thanh điều hướng / Sidebar | `--sidebar` | `#101720` | header, subnav, bottom nav, footer, ô nhập lõm |
| Bề mặt thẻ | `--card` | `#151D28` | card, tile, khung bài học |
| Bề mặt hover / phụ | `--card-hover` · `--card-2` | `#1C2735` | trạng thái hover thẻ, `.surface`, header bảng |
| Viền mảnh | `--line` · `--border` | `#263241` | đường kẻ phân cách, viền card/nút/input (`--line-strong: #3B4C63`) |
| Chữ chính | `--foreground` | `#F1F5F9` | tiêu đề, nội dung học, câu tiếng Đức |
| Chữ phụ | `--muted` | `#94A3B8` | mô tả, metadata, bản dịch phụ |
| Nhấn chính (Primary Accent) | `--accent` · `-text` · `--on-accent` | `#22C55E` / `#4ADE80` / `#07130C` | nút chính (`.btn-primary`), tiến độ, khu **Tiếng Đức**, trình độ A1–A2, trạng thái đúng |
| Nhấn phụ (Secondary Accent) | `--link` · `--gem` · `--phrase` | `#38BDF8` | liên kết, focus input, trình độ B1–B2, cụm từ, kim cương |
| Cảnh báo / Lái xe | `--gold` · `--amber` | `#FBBF24` / `#FCD34D` | khu **Lái xe**, nhãn Premium/Mới, cảnh báo nhẹ |
| Nguy hiểm / Lỗi | `--red` · `--red-dark` | `#F87171` / `#DC2626` | câu sai, xóa, lỗi, đang ghi âm |
| Khu LiD / Ghi âm | `--coral` · `--coral-text` | `#FB923C` / `#FDBA74` | khu **Leben in Deutschland**, nút ghi âm |
| Cao cấp (C1–C2) | `--grape` · `--grape-text` | `#A78BFA` / `#C4B5FD` | nhãn trình độ C1–C2 |

### Màu nhận diện khu vực (`data-sec`)
Đặt `data-sec="de|laixe|lid|ink"` trên khung trang/khu vực để cấp `--sec`, `--sec-dark`, `--sec-soft`, `--sec-text`, `--on-sec`.  
Nguyên tắc tối giản: **dùng màu khu vực tiết chế** (icon tint, gạch chân tab active, thanh tiến độ, badge nhỏ) — tránh gradient loè loẹt hay hiệu ứng neon.

---

## 2. Typography

- **UI & Tiêu đề:** **Manrope** (`--font-body`, `subsets: ["latin", "vietnamese"]`, weight `400–800`) — thân thiện, sắc nét với dấu chồng tiếng Việt (`ệ, ồ, ử, ẫ`) và ký tự Đức (`ä, ö, ü, ß`).
- **Số liệu / Chính tả / Mã:** **Geist Mono** (`--font-geist-mono`) + `tabular-nums` cho điểm số, thời gian, tiến độ.
- **Khoảng dòng tiêu đề:** luôn ≥ `1.2` để không cắt dấu tiếng Việt.
- **Thang chữ:**
  - `.display`: tiêu đề chính (`clamp(1.85rem, 1.35rem + 2.1vw, 2.85rem)`, weight `800`, tracking `-0.025em`)
  - `.page-title` (`h1`): tiêu đề trang (`clamp(1.4rem, 1.2rem + 0.8vw, 1.85rem)`, weight `700`, tracking `-0.02em`)
  - `.section-title` (`h2`): tiêu đề mục (`1.125rem–1.25rem`, weight `700`, tracking `-0.015em`)
  - `.label`: nhãn nhóm nhỏ in hoa (`11–12px`, tracking `0.06em`, `text-muted`)

---

## 3. Bề mặt, Khoảng cách & Chiều sâu

- **Phẳng & sắc nét:** `.card`, `.tile` = nền `--card` (`#151D28`) + viền `1px solid #263241`, hover sang `#1C2735` với viền `#3B4C63`.
- **Không lồng card trong card:** Danh sách dài dùng `divide-y divide-line`; nhóm phụ dùng `.surface` (`--card-2`).
- **Bóng đổ có kỷ luật:** Chỉ dùng bóng nhẹ cho lớp nổi thật sự (`.popover`, `.dialog`, `.toast`).
- **Linh vật (`Mascot`):** Giữ làm điểm nhấn thân thiện ở logo, trang chủ, empty state, loading và error — không rải dày đặc.

---

## 4. Thành phần chuẩn & Điều hướng

- **Điều hướng toàn cục:** Header desktop sticky (`#101720`, viền đáy `#263241`), tab sạch có trạng thái active rõ ràng; thanh tab con thống nhất cho từng sản phẩm (Tiếng Đức · Lái xe · Leben in DE), tự ẩn trong màn học/thi; mobile bottom nav vùng chạm ≥ `44px`.
- **Đầu trang (`<PageHeader>`):** Bố cục ngang gọn, icon khu vực, tiêu đề, mô tả, actions; trang `/tieng-duc` dùng Hero đầy đủ kèm xem trước màn học, Tiếp tục học, Trình độ A1–C2, Khám phá theo chủ đề và Thư viện video.
- **Nút (`.btn`):** trung tính (`#151D28` + viền `#263241`), `.btn-primary` (`#22C55E` chữ `#07130C` đạt AAA), `.btn-soft`, `.btn-ghost`, `.btn-amber`, `.btn-red`, `.btn-record`/`.btn-recording`, `.btn-icon`.

---

## 5. Màn đặc biệt được bảo toàn

- **`.theme-fahrschule`** (màn câu hỏi & thi thử Lái xe): giữ giao diện sáng, rõ, mô phỏng phần mềm thi lý thuyết thật (luôn sáng kể cả khi bật Dark mode), đồng bộ font và bo góc với hệ mới.

---

## 6. Ứng dụng iOS (`mobile/`)

Bản Web được triển khai trước để giữ ổn định bản App Store hiện tại. Bảng ánh xạ chi tiết giữa token/component Web và `mobile/src/lib/theme.ts`, `mobile/src/components/ui.tsx` sẽ được đồng bộ tại `docs/ios-design-sync.md`.
