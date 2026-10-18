# 🇩🇪 Deutsch Shadowing

App Next.js đơn giản để luyện shadowing tiếng Đức:

- **Bài học do admin đăng**: danh sách trên trang chủ, lọc theo cấp độ A1–C2.
- **Tự luyện với YouTube**: người dùng dán link → `/watch/[videoId]`, phụ đề tiếng Đức được lấy tự động (ưu tiên phụ đề thủ công, nếu không có thì dùng sub tự động).
- **File trên máy** (`/local`): tải audio/video lên, kèm `.srt`/`.vtt` nếu có; nếu không, app tự tạo phụ đề bằng Whisper.

## Chạy

```bash
npm install
cp .env.example .env.local   # đặt ADMIN_PASSWORD và AUTH_SECRET
npm run dev                  # http://localhost:3000
```

## Admin

Vào `/admin` (link "Quản trị" ở cuối trang chủ), đăng nhập bằng `ADMIN_PASSWORD`.

1. **+ Bài mới** → dán link YouTube → **Lấy phụ đề** (tự điền tiêu đề + phụ đề dạng SRT).
2. Sửa lại chính tả / dấu câu / thời gian ngay trong ô SRT nếu cần (sub tự động hay sai).
3. Chọn cấp độ, viết mô tả, chọn "Đăng công khai" hoặc để bản nháp → **Lưu**.

Bản nháp chỉ admin xem được. Dữ liệu lưu trong SQLite (`data/shadow.db`, dùng `node:sqlite` có sẵn trong Node ≥ 22.5) — cần chạy trên server có ổ đĩa lưu lâu dài (VPS, Docker, Railway, Fly…), không phù hợp serverless như Vercel.

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
- **File local** không có `.srt` → âm thanh được tách trên trình duyệt (mono 16kHz), gửi theo từng đoạn 10 phút.

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

## Cấu trúc

```
src/
  app/page.tsx                 # trang chủ: danh sách bài + ô dán link YouTube
  app/watch/[videoId]/         # luyện với video YouTube bất kỳ
  app/lesson/[id]/             # luyện bài do admin đăng
  app/local/                   # luyện với file trên máy
  app/admin/                   # đăng nhập, danh sách, tạo/sửa bài (server actions)
  lib/db.ts                    # SQLite (bảng lessons)
  lib/auth.ts                  # đăng nhập admin bằng cookie ký HMAC
  app/api/youtube/route.ts     # lấy phụ đề YouTube (Innertube API)
  app/api/transcribe/route.ts  # proxy tới Whisper API
  components/ShadowPlayer.tsx  # màn hình luyện shadowing
  components/YouTubePlayer.tsx # YouTube IFrame API
  components/LocalPlayer.tsx   # <video> cho file local
  hooks/useRecorder.ts         # ghi âm bằng MediaRecorder
  lib/subtitles.ts             # parse SRT/VTT/YouTube XML, gộp câu
  lib/audio.ts                 # tách audio + chia đoạn ở trình duyệt
```
