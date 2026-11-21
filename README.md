# HalloVN (hallovn.de)

Tên miền chính thức là **hallovn.de**. ckk.biz và ckk.pro (tên cũ) không dùng nữa, chỉ còn chuyển hướng về hallovn.de
(và phục vụ `/api/*` cho app di động bản cũ — xem `src/proxy.ts`).

Một app Next.js cho cả hallovn.de: đăng ký / đăng nhập một lần rồi học theo tab **Tiếng Đức · Lái xe · Leben in DE**,
cộng các trang doanh nghiệp / pháp lý của HalloVN (trước ở repo `ckk-biz`, nay đã gộp hẳn vào đây).

## Cấu trúc

```
hallovn.de/                    # repo (GitHub: chungkk/shadowing-neu), máy Mac: ~/Code/hallovn/hallovn.de
├── src/
│   ├── app/
│   │   ├── (app)/             # app học: thanh tab, đăng nhập. / = Tiếng Đức, /lai-xe, /leben-in-deutschland…
│   │   ├── (company)/         # trang doanh nghiệp + pháp lý (DE/EN/VI): /about, /fuehrerschein, /lid, /privacy, /impressum…
│   │   ├── api/v1/            # API cho web + app mobile HalloVN
│   │   └── api/fuehrerschein/ # API câu hỏi cho app lái xe riêng (iOS/Android), đọc content/laixe/
│   ├── components/
│   │   ├── auth/  quiz/  laixe/  lid/
│   │   ├── company/           # giao diện trang doanh nghiệp (Header, Footer, LocaleContext, ProductPageView…)
│   │   └── *.tsx              # phần tiếng Đức (ShadowPlayer, VocabList, DeckStudy…) + dùng chung
│   ├── lib/
│   │   ├── laixe/             # câu hỏi + luật chấm thi lái xe, catalog cho API (catalog.mjs), guard
│   │   ├── lid/  quiz/
│   │   ├── company/           # cấu hình site, SEO, trang sản phẩm, văn bản pháp lý
│   │   └── *.ts               # lõi: db, auth, api, phần tiếng Đức (subtitles, srs, dictation…)
│   ├── content/               # dữ liệu đóng gói: decks/, fuehrerschein/, lid/
│   ├── hooks/
│   └── proxy.ts
├── mobile/                    # app React Native HalloVN (dùng chung ../src/lib qua @shared, ../src/content qua @content)
├── content/laixe/             # catalog câu hỏi phục vụ /api/fuehrerschein/* (không sửa tay)
├── tools/laixe-catalog/       # tạo / dịch / publish catalog lái xe (trước nằm ở repo ckk-biz) — xem README trong đó
├── tools/tro-ly/              # Trợ lý HalloVN: chatbot thủ tục giấy tờ (server + widget), kho kiến thức ở content/tro-ly/ — xem README trong đó
├── scripts/                   # nhập dữ liệu Lái xe/LiD, backup, tiện ích
├── e2e/                       # Playwright
└── public/                    # /ckk = media câu hỏi lái xe, /lid, /apps… (đường dẫn công khai, không đổi tên)
```

- Route group `(app)` / `(company)` không ảnh hưởng URL. Các URL app iOS/Android đang dùng → **không đổi đường dẫn**.
- Hai root layout → đổi qua lại giữa app học và trang doanh nghiệp là tải lại cả trang (bình thường). 404 chung: `app/global-not-found.tsx`.
- `src/proxy.ts` — `www.hallovn.de/*`, `ckk.biz/*`, `www.ckk.biz/*`, `ckk.pro/*` → 308 về `hallovn.de` (trừ `/api/*`: app di động
  đã phát hành gọi thẳng `ckk.pro/api/v1` hoặc `ckk.biz/api/v1` kèm Bearer token). Link pháp lý cũ `ckk.pro/privacy|terms` → `/deutsch-shadowing/privacy|terms`.

## Dữ liệu Lái xe / LiD

- **Catalog cho app lái xe** (`content/laixe/`): sửa bằng `npm run catalog:publish -- …` (xem `tools/laixe-catalog/README.md`),
  kiểm tra `npm run test:catalog`, rồi deploy.
- **Tab Lái xe / LiD của HalloVN**: `npm run import:content` — đọc `content/laixe/catalog_all` + dữ liệu hạng/đề mẫu của app lái xe
  và câu hỏi/ảnh của app LiD. Hai app này là dự án độc lập ở `~/Code/fuehrerschein-app`, `~/Code/lid-app` (đổi bằng `APPS_DIR=…`).
  Sau đó app mobile: `node mobile/scripts/import-quiz-media.mjs`. Tiến độ trả lời lưu ở bảng `quiz_answers` (tự tạo).

---

Phần tiếng Đức (shadowing):

- **Bài học do admin đăng**: danh sách trên trang chủ, lọc theo cấp độ A1–C2.
- **Tự luyện với YouTube**: người dùng dán link → `/watch/[videoId]`, phụ đề tiếng Đức được lấy tự động (ưu tiên phụ đề thủ công, nếu không có thì dùng sub tự động).

## Chạy

```bash
npm install
cp .env.example .env.local   # đặt ADMIN_EMAIL, ADMIN_PASSWORD và AUTH_SECRET
npm run dev                  # http://localhost:3000
```

## Admin

Đăng nhập ở `/login` bằng `ADMIN_EMAIL` + `ADMIN_PASSWORD` → link "Quản trị" hiện trên thanh đầu trang.
Quản lý tài khoản (cấp/bỏ quyền admin, xoá) ở `/admin/users`.

**Phân quyền:**
- **Khách**: học bài admin đăng, dán link YouTube (phụ đề YouTube).
- **Học viên** (tự đăng ký ở `/register`): như khách + tạo phụ đề bằng Whisper (tốn tiền API nên cần đăng nhập).
- **Admin**: như học viên + tạo/sửa/xoá bài học, quản lý người dùng.

1. **+ Bài mới** → dán link YouTube → **Lấy phụ đề** (tự điền tiêu đề + phụ đề dạng SRT).
2. Sửa lại chính tả / dấu câu / thời gian ngay trong ô SRT nếu cần (sub tự động hay sai).
3. Chọn cấp độ, viết mô tả, chọn "Đăng công khai" hoặc để bản nháp → **Lưu**.

Bản nháp chỉ admin xem được. Dữ liệu lưu trong SQLite (`data/shadow.db`, dùng `node:sqlite` có sẵn trong Node ≥ 22.5) — cần chạy trên server có ổ đĩa lưu lâu dài (VPS, Docker, Railway, Fly…), không phù hợp serverless như Vercel.

### Backup tự động

Cài hoặc cập nhật (chạy trên Mac, cần `ssh oracle`): `scripts/backup/install.sh`

- **VPS** (cron 02:30 UTC): chụp `shadow.db` + ảnh đại diện vào `~/shadow-backup/archive`, giữ 7 bản. Log: `~/shadow-backup/backup.log`.
- **Mac** (launchd 09:00, máy ngủ thì chạy khi thức dậy): tải về `~/Backups/shadow-new`, kiểm tra checksum + `quick_check`, giữ 60 bản. Log: `pull.log` cùng thư mục. Lỗi hoặc không có bản mới trong 3 ngày → hiện thông báo macOS.

Bản backup có email và hash mật khẩu, đừng để vào thư mục đồng bộ cloud. Cache TTS không được backup (tạo lại được, nhưng tốn API).

Khôi phục: dừng app trên Coolify, rồi trên VPS giải nén bản backup vào `~/restore` và chạy lệnh dưới, sau đó bật lại app:

```bash
docker run --rm -v mmmxvvm5awcsrqv8wdadovea-shadow-data:/data -v ~/restore:/r:ro node:24-slim \
  sh -c 'rm -f /data/shadow.db-journal && cp /r/shadow.db /data/shadow.db && cp -r /r/avatars/. /data/avatars/ && chown -R 1000:1000 /data/shadow.db /data/avatars'
```

### Whisper: tạo phụ đề bằng AI (tuỳ chọn)

Copy `.env.example` → `.env.local` rồi điền API key (OpenAI hoặc Groq — Groq có free tier và nhanh hơn):

```bash
TRANSCRIBE_API_KEY=gsk_...
TRANSCRIBE_API_URL=https://api.groq.com/openai/v1/audio/transcriptions
TRANSCRIBE_MODEL=whisper-large-v3
```

Khi đã cấu hình key:

- **Video YouTube không có phụ đề** → server tự tải audio (m4a ~48kbps, tải theo khúc song song nên rất nhanh) và gửi Whisper. Giới hạn ~1 giờ video (25MB). Nếu YouTube chặn tải video dài (chỉ còn video < 3 phút chạy được) → xem [docs/youtube-audio-download.md](docs/youtube-audio-download.md).
- Ô chọn phụ đề có thêm **🤖 Whisper (AI)** — dùng khi sub tự động của YouTube sai nhiều (Whisper có dấu câu, chính xác hơn).

Phụ đề được cache trong SQLite: Whisper chỉ chạy **1 lần** cho mỗi video, phụ đề YouTube cache 7 ngày.

## Cách luyện

| Tính năng | Mô tả |
| --- | --- |
| Từng câu / Liên tục | Dừng sau mỗi câu, hoặc phát bình thường và highlight câu đang nói |
| Nghỉ để nói | Sau mỗi câu, tạm dừng một khoảng = N × độ dài câu để bạn nói lại |
| Lặp mỗi câu | Phát mỗi câu 1–5 lần |
| Tự sang câu tiếp | Kết hợp với "nghỉ để nói" để luyện rảnh tay |
| Ghi âm | Ghi lại giọng bạn cho từng câu, nghe lại để so sánh; có thể tự ghi âm trong lúc nghỉ |
| Ẩn chữ | Luyện nghe không nhìn phụ đề (di chuột để xem) |
| Gộp thành câu | Gộp các dòng sub ngắn thành câu hoàn chỉnh |
| Tra từ | Bấm vào từ → mở dict.cc; "Dịch câu này" → Google Dịch (de → vi) |

Phím tắt: `Space` phát/dừng · `←` `→` câu trước/sau · `R` ghi âm · `P` nghe lại · `H` ẩn chữ.
