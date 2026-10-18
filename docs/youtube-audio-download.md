# Khắc phục: Whisper không tải được audio YouTube (video > 3 phút)

Tài liệu này dùng khi YouTube thay đổi cơ chế chống bot và app **không còn tạo được phụ đề Whisper cho video dài**.

## Bối cảnh: hiện đang chạy thế nào

Whisper cần file audio. Server tải audio trực tiếp từ YouTube trong [`src/lib/youtube.ts`](../src/lib/youtube.ts):

| Việc | Client Innertube | Ghi chú |
| --- | --- | --- |
| Lấy phụ đề + tiêu đề | `ANDROID` (`fetchPlayer`) | Ổn định, không cần token |
| Tải audio cho Whisper | `VISIONOS` + `visitorData` (`fetchAudioFormats`) | Tải được **trọn file** |
| Dự phòng khi VISIONOS lỗi | luồng audio của `ANDROID` | Chỉ tải được **~1MB đầu ≈ 3 phút** |

Tại sao lại có giới hạn ~1MB: từ 2025 YouTube bắt buộc **PO token** (token chống bot do BotGuard tạo ra) với
hầu hết các client. Nếu không có token, link `googlevideo.com` chỉ trả về khoảng 1MB đầu, từ đó trở đi
trả về `403`/`400`. Một số client (hiện là `VISIONOS`) tạm thời chưa bị bắt buộc, nên vẫn tải được trọn file.
**Đây là mẹo không chính thức và có thể ngừng chạy bất cứ lúc nào.**

## Triệu chứng

- Chọn **🤖 Whisper (AI)** với video dài báo lỗi:
  - `YouTube chặn tải audio của video này (hiện chỉ video ngắn dưới ~3 phút mới tải được)…`. Nghĩa là
    `VISIONOS` đã hỏng và code đang dùng phương án dự phòng `ANDROID`.
  - `YouTube chặn tải audio của video này…`. Nghĩa là `VISIONOS` vẫn trả về link nhưng link bị `403` giữa chừng.
  - `Không tải được audio (hết thời gian chờ)`. Có thể YouTube đang làm chậm (throttle) request.
- Video ngắn vẫn chạy, video dài thì không.

## Bước 1: Chẩn đoán

```bash
node scripts/probe-youtube-audio.mjs              # video test mặc định (~15 phút)
node scripts/probe-youtube-audio.mjs <videoId>    # hoặc video bị lỗi
```

Script thử lần lượt từng client và tải 1KB ở đầu, giữa và cuối file audio. Ví dụ kết quả khi mọi thứ bình thường:

```
=== KẾT QUẢ ===
VISIONOS   FULL OK ✅
ANDROID    chỉ ~1MB đầu (≈3 phút) ⚠️
IOS        chỉ ~1MB đầu (≈3 phút) ⚠️
```

Cách đọc:

| Kết quả của VISIONOS | Nghĩa | Làm gì |
| --- | --- | --- |
| `FULL OK ✅` | Client vẫn chạy, lỗi nằm chỗ khác | Xem [Lỗi khác](#lỗi-khác) |
| `player LOGIN_REQUIRED` | YouTube đòi đăng nhập ("kein Bot"), thường do `visitorData` sai hoặc client bị chặn | Bước 2 |
| `chỉ ~1MB đầu` | Client giờ cũng bị bắt PO token | Bước 2 |
| `chỉ có signatureCipher` | Link bị mã hoá, phải giải mã bằng JS player | Bước 2 (chọn client khác) |
| `visitorData: KHÔNG TÌM THẤY` | Trang watch đổi cấu trúc | Sửa regex `VISITOR_DATA` trong `getVisitorData` |

## Bước 2: Tìm client mới (dựa theo yt-dlp)

yt-dlp được cập nhật rất nhanh mỗi khi YouTube thay đổi. Cách nhanh nhất là xem yt-dlp đang dùng client nào.

### 2.1. Dùng bản yt-dlp mới nhất (không cần cài)

```bash
curl -L -o /tmp/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos
chmod +x /tmp/yt-dlp
/tmp/yt-dlp --version
```

> Linux: đổi `yt-dlp_macos` thành `yt-dlp_linux`.

### 2.2. Xem yt-dlp tải audio bằng client nào

```bash
/tmp/yt-dlp -f "139/249/worstaudio" -o "/tmp/test.%(ext)s" --force-overwrites \
  "https://www.youtube.com/watch?v=RbtIMGCizu0"
```

Tìm dòng có dạng:

```
[youtube] RbtIMGCizu0: Downloading visionos player API JSON
```

Chữ đứng trước `player API JSON` là tên client (ví dụ `visionos`, `tv`, `android_vr`, `web_safari`, `mweb`…).

- Nếu **tải thành công**: client đó dùng được, sang bước 2.3.
- Nếu yt-dlp bản mới nhất cũng bị `403`: xem [Bước 3](#bước-3-khi-không-còn-client-nào-chạy-được).
- Muốn thử từng client cụ thể:

```bash
/tmp/yt-dlp -v --extractor-args "youtube:player_client=tv" -f 139 -o "/tmp/test.%(ext)s" \
  --force-overwrites "https://www.youtube.com/watch?v=RbtIMGCizu0"
```

### 2.3. Lấy cấu hình client từ mã nguồn yt-dlp

```bash
curl -sL https://raw.githubusercontent.com/yt-dlp/yt-dlp/master/yt_dlp/extractor/youtube/_base.py \
  | grep -n -A 22 "'visionos'"      # thay 'visionos' bằng tên client tìm được
```

Kết quả có dạng:

```python
'visionos': {
    'INNERTUBE_CONTEXT': {
        'client': {
            'clientName': 'VISIONOS',
            'clientVersion': '1.02',
            'deviceMake': 'Apple',
            'deviceModel': 'RealityDevice17,1',
            'userAgent': 'Mozilla/5.0 (...) Safari/605.1.15',
            'osName': 'visionOS',
            'osVersion': '26.5.23O471',
        },
    },
    'INNERTUBE_CONTEXT_CLIENT_NAME': 101,
    'REQUIRE_JS_PLAYER': False,
    ...
},
```

Cần để ý:

- `INNERTUBE_CONTEXT.client`: chép nguyên vào code.
- `INNERTUBE_CONTEXT_CLIENT_NAME`: số dùng cho header `X-YouTube-Client-Name`.
- `REQUIRE_JS_PLAYER: False`: **bắt buộc phải là False**. Nếu là `True` thì link bị mã hoá (`signatureCipher`/`n`-param),
  app không giải mã được, nên chọn client khác.
- `PO_TOKEN_REQUIRED_CONTEXTS` (nếu có `GVS`): client cần PO token để tải media, nên không dùng được.
- `REQUIRE_AUTH: True`: cần đăng nhập, không dùng được.

### 2.4. Thử client mới bằng script trước khi sửa code

```bash
node scripts/probe-youtube-audio.mjs RbtIMGCizu0 --client '{
  "clientName": "TVHTML5",
  "clientVersion": "7.20260101.00.00",
  "clientNameId": 7,
  "userAgent": "Mozilla/5.0 (...)"
}'
```

(`clientNameId` = `INNERTUBE_CONTEXT_CLIENT_NAME`; các trường khác chép từ `INNERTUBE_CONTEXT.client`.)

Phải thấy `CUSTOM  FULL OK ✅` thì mới sửa code.

### 2.5. Cập nhật code

Trong [`src/lib/youtube.ts`](../src/lib/youtube.ts):

1. Sửa `VISIONOS_UA` và `VISIONOS_CLIENT` theo client mới (nên đổi tên cho đúng, ví dụ `AUDIO_CLIENT`).
   Nhớ giữ `hl: "de"`.
2. Trong `fetchAudioFormats`, sửa header `"X-YouTube-Client-Name": "101"` thành số `INNERTUBE_CONTEXT_CLIENT_NAME` mới.
3. Nếu client mới **không cần** `visitorData` (script cho kết quả FULL OK mà không cần), vẫn có thể giữ nguyên, vì gửi thừa cũng không sao.
4. Cập nhật client tương ứng trong `scripts/probe-youtube-audio.mjs` để lần sau so sánh.

### 2.6. Kiểm tra

```bash
npx tsc --noEmit -p .
# Xoá cache Whisper của video test (nếu đã có) rồi gọi API:
node -e 'const {DatabaseSync}=require("node:sqlite");new DatabaseSync("data/shadow.db").prepare("DELETE FROM transcript_cache WHERE key LIKE ?").run("yt:RbtIMGCizu0:%")'
curl -s "http://localhost:3000/api/youtube?url=RbtIMGCizu0&lang=whisper" | head -c 400
```

Kết quả đúng là JSON có `"track":{"languageCode":"whisper"…}` và khoảng 200 segment, phủ hết khoảng 925 giây.

## Bước 3: Khi không còn client nào chạy được

Lúc đó chỉ còn cách tạo PO token. Các lựa chọn, theo thứ tự dễ làm trước:

### A. Gọi yt-dlp + plugin PO token từ server (ĐÃ LÀM)

Đã cài sẵn trong [`Dockerfile`](../Dockerfile): `yt-dlp[default]` (venv `/opt/yt-dlp`) + plugin
[`bgutil-ytdlp-pot-provider`](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) ở **chế độ script**
(server build sẵn ở `/opt/bgutil/server`, chạy bằng Node, không cần container riêng).

Code ở [`src/lib/ytdlp.ts`](../src/lib/ytdlp.ts). Trong `getYouTubeTranscript`, Innertube vẫn là đường chính;
yt-dlp được gọi khi:

- `fetchPlayer` lỗi (IP bị chặn, `LOGIN_REQUIRED`) → lấy tiêu đề + danh sách phụ đề bằng `yt-dlp -J`
- tải phụ đề lỗi → `yt-dlp --write-subs/--write-auto-subs`
- tải audio cho Whisper lỗi → `yt-dlp -f 139/249/worstaudio`

Máy không có yt-dlp (vd. `npm run dev` ở local) → bỏ qua, báo lỗi gốc.

Kiểm tra trong container:

```bash
docker exec -it <container> yt-dlp -v --js-runtimes node \
  --extractor-args "youtubepot-bgutilscript:server_home=/opt/bgutil/server" \
  -f 139 -o /tmp/t.m4a "https://www.youtube.com/watch?v=RbtIMGCizu0"
```

Phải thấy `PO Token Providers: … bgutil:script-node-2.0.2` và `Generating a … PO Token`. Log lỗi của yt-dlp
được in ra stdout của app với tiền tố `[yt-dlp]`.

**Nếu vẫn báo "…kein Bot…" / "Sign in to confirm"**: PO token không vượt được chặn theo IP. Thêm một trong hai
(xem `.env.example`):

- `YTDLP_COOKIES=/app/data/youtube-cookies.txt`: cookies (Netscape) của **tài khoản phụ**, xuất từ trình duyệt
  ẩn danh theo [hướng dẫn của yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies).
- `YTDLP_PROXY=socks5://…`: proxy IP dân dụng.

Cập nhật yt-dlp khi YouTube đổi: build lại image (Coolify: Redeploy, bỏ cache). Muốn đổi bản bgutil: sửa
`ARG BGUTIL_VERSION` trong Dockerfile.

### B. Tự tạo PO token bằng JS (không cần Python)

Thư viện [`bgutils-js`](https://github.com/LuanRT/BgUtils) + [`youtubei.js`](https://github.com/LuanRT/YouTube.js)
chạy BotGuard bằng `jsdom` để tạo PO token. Sau đó thêm `serviceIntegrityDimensions.poToken` vào body
request player và `&pot=<token>` vào link tải. Cách này phức tạp và dễ hỏng mỗi khi YouTube đổi BotGuard,
nên chỉ dùng khi không thể cài yt-dlp.

### C. Chấp nhận giới hạn

Không sửa gì: code tự quay về client `ANDROID`, chỉ tạo phụ đề Whisper cho video ngắn và báo lỗi rõ ràng với video dài.
Người dùng vẫn còn:

- Phụ đề YouTube (thủ công/tự động), vẫn lấy được qua `ANDROID`.
- Mục **File trên máy** (`/local`): tải file audio/video lên, trình duyệt tách audio rồi gửi Whisper (không phụ thuộc YouTube).

## Lỗi khác

| Lỗi | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `Không tải được audio (hết thời gian chờ)` | YouTube làm chậm (throttle) / treo request, hay gặp ở khúc cuối file | Tăng `AbortSignal.timeout(8_000)` hoặc số lần thử lại trong `fetchRange`; giảm số luồng song song (6) |
| `Video quá dài… (tối đa khoảng 1 giờ)` | File > 24MB (giới hạn 25MB của Groq/OpenAI free tier) | Groq dev tier cho phép 100MB, khi đó tăng `WHISPER_MAX_BYTES` trong `src/lib/whisper.ts`. Hoặc cắt audio (cần ffmpeg) |
| `Lỗi API nhận dạng giọng nói (429)` | Hết hạn mức Groq (free: 7.200 giây audio mỗi giờ) | Đợi; xem header `x-ratelimit-*` |
| `attempt to write a readonly database` | File `data/shadow.db` bị thay/xoá trong lúc server đang chạy | Restart `npm run dev` |
| Phụ đề Whisper có câu lạ ("Untertitelung des ZDF"…) | Whisper bịa khi gặp nhạc/im lặng | Thêm mẫu vào `CREDITS` / `NOISE_ONLY` trong `filterHallucinations` (`src/lib/whisper.ts`) |

## Tham khảo

- yt-dlp, danh sách client: `yt_dlp/extractor/youtube/_base.py` → `INNERTUBE_CLIENTS`
- yt-dlp wiki về PO token: https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide
- yt-dlp issues (tìm "403", "po token", tên client): https://github.com/yt-dlp/yt-dlp/issues
