# Trợ lý HalloVN (chatbot hỗ trợ thủ tục)

Chatbot trả lời thành viên về giấy tờ, cư trú, học nghề, bảo hiểm, thuế… ở Đức.
Hiện là **server Node riêng** (chưa gắn vào app Next.js), nhúng vào web bằng một thẻ `<script>`.

```
content/tro-ly/            # KHO KIẾN THỨC (commit vào git)
├── topics.json            # 35 chủ đề cẩm nang + 67 câu hỏi hay gặp: gợi ý, điều luật, link nguồn
├── laws/                  # 216 điều luật nguyên văn từ gesetze-im-internet.de (không có bản quyền, § 5 UrhG)
├── articles/              # BÀI CỦA HALLOVN – chỗ cần cải thiện chính. 1 file = 1 chủ đề
├── official/              # (gitignore) trang cơ quan nhà nước tải về, chỉ làm tài liệu đầu vào
└── index.json             # (gitignore) sinh bằng `npm run index`
tools/tro-ly/
├── scripts/               # extract → fetch → draft → index
├── server/                # API /api/chat (stream) + tìm kiếm BM25 tiếng Việt có/không dấu
└── public/widget.js       # widget chat nhúng vào web
```

## Nguồn gốc dữ liệu
`topics.json` được rút từ bản crawl ankommly.de (`~/ankommly-crawl`), **chỉ lấy dữ kiện**: tên chủ đề,
điều luật được viện dẫn, link nguồn chính thức. Không dùng câu chữ của Ankommly. Mọi bài trong
`articles/` phải được viết mới từ luật và nguồn chính thức.

## Chạy

```bash
cd tools/tro-ly
npm install
export ANTHROPIC_API_KEY=sk-ant-...

npm run extract -- ~/ankommly-crawl   # (chỉ khi crawl lại) cập nhật topics.json
npm run fetch                          # tải luật + trang chính thức (bỏ qua file đã có; --force để tải lại)
npm run draft -- --limit 3             # Claude viết nháp 3 bài để xem chất lượng
npm run draft                          # viết các bài còn thiếu (~102 bài, ước ~10–15 $)
npm run draft -- anmeldung --force     # viết lại 1 bài
ALLOW_DRAFTS=1 npm run index           # gom bài (kể cả nháp) → index.json
npm start                              # http://localhost:8787/demo.html
```

## Quy trình duyệt bài
1. Mở `content/tro-ly/articles/<id>.md`, đối chiếu với luật ở `laws/` và link trong `sources`.
2. Sửa nội dung, xoá khối `<!-- CẦN KIỂM TRA … -->`.
3. Đổi `status: draft` → `status: reviewed`, điền `reviewed_by`, cập nhật `updated`.
4. `npm run index` (không có `ALLOW_DRAFTS`) → chỉ bài đã duyệt được dùng.

Bài `anmeldung.md` là mẫu viết tay (vẫn là `draft`, cần người duyệt).

## Nhúng vào hallovn.de
Triển khai server (vd `chat.hallovn.de` sau reverse proxy có HTTPS, tắt buffering cho `/api/chat`), rồi:

```html
<script src="https://chat.hallovn.de/widget.js" data-color="#c8102e" defer></script>
```

Biến môi trường: xem `.env.example` (`MODEL`, `EFFORT`, `ALLOWED_ORIGINS`, `RATE_LIMIT`, `ARTICLE_BASE_URL`, `TRO_LY_KB`).

## Ý tưởng cải thiện sau
- Gắn vào app Next.js: chuyển `server/` thành route `src/app/api/v1/tro-ly/route.ts`, widget thành component React,
  dùng đăng nhập sẵn có để giới hạn câu hỏi theo tài khoản thay vì theo IP.
- Đăng `articles/` thành trang cẩm nang công khai (SEO), rồi đặt `ARTICLE_BASE_URL` để bot dẫn link về bài.
- Thêm bài cho chủ đề còn thiếu: Bürgergeld, Elterngeld, Minijob, chuyển việc sau học nghề…
- Tải các nguồn PDF đang bị bỏ qua (15 link lỗi khi `npm run fetch`).
- Rà lại số tiền/mức phí mỗi đầu năm (Mindestlohn, Minijob, phí thẻ cư trú…).
- Cập nhật Datenschutzerklärung: câu hỏi của thành viên được gửi tới Anthropic (Claude API).
