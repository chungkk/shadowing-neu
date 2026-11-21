# HalloVN · Design System "Nhãn vở"

Nguồn gốc: cuốn vở học trò Việt Nam và Schulheft của Đức — bìa màu phẳng, nhãn vở trắng viền đôi, giấy ô ly, bút dạ quang. Người dùng là người Việt ở Đức đang học tiếng Đức, ôn bằng lái và thi quốc tịch; ai cũng từng dán nhãn vở.

Tinh thần: vui nhưng không trẻ con · hiện đại nhưng ấm · nhiều màu nhưng mỗi màu có việc · chuyên nghiệp nhưng không cứng.

Code thật: `src/app/(app)/globals.css` (token + primitive), `src/components/PageHeader.tsx` (đầu trang chữ ký).

## 1. Màu

Mặc định giao diện **sáng** (giấy trắng ấm `--background #fbfaf7`, mực xanh đen `--foreground #16203a`). Tối = **đen thuần** (`--background #000000`, thẻ `#111111`, không ánh xanh/tím) qua `[data-theme="dark"]`, cùng tên token.

| Vai | Token | Dùng cho |
|---|---|---|
| Thương hiệu / hành động chính | `--accent` (xanh lam vở) · `-dark` · `-soft` · `-text` | nút chính, link, focus, khu **Tiếng Đức** |
| Vàng | `--gold` · `-soft` · `--amber` (chữ) | khu **Lái xe**, thưởng, bút dạ quang `.highlight` |
| Coral | `--coral` · `-soft` · `-text` | khu **Leben in Deutschland**, nói / ghi âm |
| Tím | `--grape` · `-soft` · `-text` | khu **Game** |
| Đúng | `--ok` · `-soft` · `-text` | câu đúng, đã xong, thành công — **không** dùng làm nút chính |
| Sai | `--red` · `-soft` · `--red-400` (chữ) | câu sai, xoá, đang ghi âm |
| Kim cương | `--gem` · `-soft` | điểm kiếm được khi học |
| Bước học (pastel) | `--aqua` nghe · `--candy` nói · `--sun` chép · `--leaf` đúng | dòng transcript đang học |

**Quan trọng:** `--accent` giờ là XANH LAM (trước là xanh lá). Mọi chỗ trước đây dùng accent / `text-accent-text` / `bg-accent-soft` / `badge-accent` / `tint-accent` để báo **đúng / hoàn thành / đã thuộc** phải đổi sang `ok` (`text-ok-text`, `bg-ok-soft`, `bg-ok`, `badge-ok`, `tint-ok`, `alert-ok`, `toast-ok`).

### Màu khu vực (`data-sec`)
Đặt `data-sec="de|laixe|lid|game|ink"` trên một khung → có `--sec`, `--sec-dark`, `--sec-soft`, `--sec-text`, `--on-sec` (utility: `bg-sec`, `text-on-sec`, `bg-sec-soft`, `text-sec-text`, `border-sec`). `ink` = tài khoản, quản trị, thông tin. `.progress-bar`, `.tabs-line` gạch chân và `.hero` tự lấy `--sec`.

## 2. Chữ

- Thân / UI: **Be Vietnam Pro** (`font-sans`) 400–800. UI thường dùng 500–700; hạn chế `font-extrabold` cho chữ nhỏ.
- Tiêu đề: **Bricolage Grotesque** (`font-display`), 700–800, tracking âm (-0.02 → -0.035em).
- Thang: `.display` (trang chủ) · `.page-title` (h1) · `.section-title` (h2) · `.label` (nhãn nhỏ in hoa của khung, ví dụ "TRANSCRIPT").
- **Cấm** đặt eyebrow/nhãn nhỏ phía trên tiêu đề (`.eyebrow` chỉ còn để không vỡ code cũ — xoá khi gặp). Tiêu đề tự đứng được.
- Không dùng chữ gradient. Nhấn bằng cỡ/độ đậm hoặc `.highlight` (bút dạ quang vàng) — tối đa một chỗ mỗi màn.

## 3. Bề mặt & chiều sâu

- **Phẳng.** `.card` / `.tile` / `.sticker` = nền trắng + viền 1px `--line`, không bóng, không gờ dưới. Bo: khung 16px, ô 12px, nút 12px.
- Chiều sâu = **lớp màu phẳng dán chồng lên nhau** (như cắt dán giấy): nhãn vở dán chồng lên mép bìa, vở xếp chồng. KHÔNG gradient nền, KHÔNG radial-glow, KHÔNG bóng cứng lệch (`0 4px 0`), KHÔNG viền trái màu >1px.
- Bóng mềm (`shadow-soft/pop/float`) chỉ cho thứ thật sự nổi: popover, dialog, toast, thẻ đang rê chuột (`.card-link`).
- Không lạm dụng card: danh sách dài → hàng phân cách bằng đường kẻ (`divide-y divide-line`) hoặc `.nhan-line`; nhóm phụ → `.surface`; không lồng card trong card.
- `.hero` = nền phẳng nhạt theo `--hero`/`--sec`. Đầu trang khu vực nên dùng `<PageHeader>` thay cho `.sticker.hero` tự ráp.

### Chữ ký: bìa vở + nhãn vở
```tsx
import PageHeader from "@/components/PageHeader";
<PageHeader sec="laixe" icon={Car} title="Bằng lái xe Đức" sub="Ôn thi lý thuyết hạng B" meta={…} actions={…} />
```
- `.cover` = khối màu bìa có gáy băng dính bên trái. `.nhan` = nhãn trắng viền đôi. `.nhan-line` = dòng kẻ chấm.
- `.o-ly` = nền giấy ô ly (chỉ cho một vùng minh hoạ nhỏ / khung luyện chép, không phủ cả trang).
- Dùng PageHeader ở trang chính của mỗi khu và các trang con quan trọng (`compact` cho trang con). Trang làm bài / màn học / màn chơi KHÔNG cần PageHeader (giữ chỗ cho nội dung).
- `mascot` chỉ ở trang tổng quan của khu, empty state, lỗi, loading — không rải khắp nơi.

## 4. Thành phần

- Nút: `.btn` (trung tính) · `.btn-primary` (xanh, 1 nút/màn) · `.btn-amber` · `.btn-red` · `.btn-record`/`.btn-recording` · `.btn-soft` · `.btn-ghost` · `.btn-icon`; cỡ `.btn-sm` / `.btn-lg` / `.btn-block`. Phẳng, bấm = scale .97, mũi tên `ArrowRight`/`ChevronRight` cuối nút tự nhích khi rê.
- Chip lọc `.chip` — đang chọn = nền mực (đảo màu). Tab: `.tabs` + `.tab` (khay), `.tabs-line` (gạch chân màu khu vực).
- Nhập: `.input`, `.input-group`, `.field`, `.field-hint`, `.field-error`, `.check`.
- Nhãn: `.badge` + `-accent|ok|gold|coral|grape|red|gem|link|muted` (góc 6px như mẩu băng dính). `.icon-bubble` + `.tint-*` (thêm `tint-ok`, `tint-coral`, `tint-grape`, `tint-sec`).
- Popup: `.dialog-backdrop` > `.dialog` (bottom sheet trên điện thoại, giữa màn trên máy tính) · `.popover` + `.menu-item` · `.toast` · `.alert-*`.
- Dữ liệu: `.table`, `.progress`/`.progress-bar` (màu khu vực, phẳng), `.stat`, `.empty`, `.skeleton`.
- Icon: chỉ lucide-react, nét 2–2.25. Không dùng emoji thay icon trong UI (emoji trong nội dung học/game giữ nguyên).

## 5. Chuyển động

- Easing `--ease-out` (expo) cho hầu hết; `--ease-spring` cho thứ "nảy" (tab, vở, nhãn). 140–320ms.
- Một khoảnh khắc chính mỗi màn (trang chủ: chồng vở xoè ra). Không cho mọi khối cùng "rise-in".
- Luôn có `prefers-reduced-motion`.

## 6. Bố cục & responsive

- Khung: `.page` (max-w-6xl) · `.page-narrow` (max-w-3xl). Điện thoại: lề 16px, thanh dưới đáy 64px, vùng chạm ≥44px (`.hit-44`).
- Mobile không phải bản thu nhỏ: hàng nút dồn thành cột/toàn chiều ngang, lưới 2–3 cột → 1 cột hoặc cuộn ngang `.scroll-row`, PageHeader tự co.

## 7. Màn đặc biệt

- `.theme-fahrschule` (màn làm câu hỏi Lái xe): xanh lá nhạt giống phần mềm thi thật, luôn sáng; nút/chữ/bo góc như hệ chung.
- `.theme-night` (màn chơi game): nền đen thuần `#000000`; chung chữ, nút, bo góc.

## 8. Ứng dụng iOS (mobile/)

Cùng design system, nhưng dựng theo kiểu native (Human Interface Guidelines) — không bê nguyên trang web vào điện thoại.

**Code thật:** `mobile/src/lib/theme.ts` (token `C`, màu khu vực `SEC`, `R`, `STICKER`, `FLOAT`) · `mobile/src/components/ui.tsx` (thành phần) · `mobile/src/components/Text.tsx` (chữ) · `mobile/src/lib/haptics.ts` (rung).

| Web | iOS |
|---|---|
| `--accent`, `--ok`, `--gold`… | `C.accent`, `C.ok`, `C.gold`… — cùng mã màu, sáng & tối |
| `data-sec="de\|laixe\|lid\|game\|ink"` | `SEC.de` · `SEC.laixe` · `SEC.lid` · `SEC.game` · `SEC.ink` |
| `<PageHeader>` (bìa + nhãn vở) | `<PageHeader sec icon title sub meta aside>` · `<Nhan>` · `<CoverTag>` |
| `.card` | `<Card>` / `...STICKER` (viền 1px, không bóng) |
| `.btn-primary` / `.btn` / `.btn-soft` | `<Button variant="primary\|plain\|soft\|amber\|red">` · `<Cta>` (nút đáy 56pt) |
| `.tabs` | `<Segmented>` (khay xám, mục chọn nổi trắng) |
| `.chip` (chọn = nền mực) | Chip lọc ở tab Bài học |
| `.icon-bubble .tint-*` | `<IconBubble>` · `TONES()` trong QuizParts |
| `.empty` | `<EmptyState>` · `<Loading>` |

Quy tắc riêng của iOS:
- **Chữ:** Be Vietnam Pro (thân) + Bricolage Grotesque (tiêu đề), nhúng qua `expo-font`. Theo Dynamic Type, chặn ở 1.6× (`MAX_SCALE`). Chữ thân tự hạ 800→700 như web.
- **Điều hướng:** tab bar native (`NativeTabs`, Liquid Glass), thanh tiêu đề native, sheet `presentation: "modal"`, `Alert`/`ActionSheet` hệ thống. Không tự vẽ lại những thứ iOS đã có.
- **Danh sách cài đặt:** ô biểu tượng màu đặc kiểu Cài đặt iOS, nhưng chỉ dùng màu thương hiệu `ICON` (`SettingsList.tsx`); kẻ phân cách thụt vào sau biểu tượng.
- **Bấm:** co nhẹ (`scale .97`), không lún sticker; vùng chạm ≥ 44pt.
- **Rung (`haptic`):** `tap` nút chính · `select` đổi lựa chọn · `success`/`error` khi chấm đúng/sai · `firm` ghi âm / nút đáy. Không rung khi cuộn hay khi chỉ xem.
- **Đăng nhập Apple:** nút đen trên nền sáng, trắng trên nền tối (HIG).
- **Icon app:** linh vật trên bìa vở xanh lam phẳng có gáy đậm bên trái (`mobile/scripts/make-icons.mjs` sinh cả icon app lẫn favicon / apple-icon của web).
- **Màn chơi game** (`FallingWords`): bảng màu đêm riêng như `.theme-night`.
