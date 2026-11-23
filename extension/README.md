# HalloVN — Chrome Extension Thuyết minh tiếng Việt

Tiện ích Chrome (Manifest V3) tích hợp trực tiếp hệ thống thuyết minh tiếng Việt của **HalloVN** vào trình duyệt:

- **YouTube (`youtube.com`)**: Gắn nút **VI** ngay trên thanh điều khiển player (cạnh nút CC). Xem được cả các video bị tắt nhúng (`101`/`150`), hỗ trợ Fullscreen với phụ đề tiếng Việt / song ngữ.
- **Mọi trang web có `<video>` + phụ đề** (Udemy, Coursera, TED, Vimeo, HTML5 video…): Tự đọc phụ đề trên trang, gửi về `/api/v1/dub/translate-cues` để dịch cuốn chiếu (~2 giây bắt đầu đọc) và đồng bộ trực tiếp theo thẻ `<video>`.
- **Video không có phụ đề sẵn**: Hỗ trợ nạp file `.SRT` / `.VTT` trực tiếp từ popup để thuyết minh ngay trên trang đang xem.
- **Tuỳ chỉnh trực tiếp**: Đổi giọng (`Nam Minh` / `Hoài My`), tốc độ đọc (`0.9×–1.4×`), âm lượng gốc / tiếng Việt, phụ đề song ngữ và đăng nhập tài khoản HalloVN để mở rộng hạn mức.

## Cách cài đặt trên Chrome / Edge / Brave / Arc

1. Mở `chrome://extensions`
2. Bật **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
3. Bấm **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục `extension/` này.
4. Mở bất kỳ video YouTube nào → bấm nút **VI** trên thanh player (hoặc bấm biểu tượng HalloVN trên thanh công cụ Chrome).

> **Lưu ý khi test local:** Mở popup → **Tài khoản HalloVN & Máy chủ** → đổi sang `localhost:3000 (Dev)` khi chạy `npm run dev`.
