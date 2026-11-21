# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người Việt đang sống hoặc chuẩn bị sang Đức. Họ học tiếng Đức (A1–B1) bên cạnh công việc, ôn lý thuyết thi bằng lái hạng B và ôn bài thi Leben in Deutschland / Einbürgerungstest. Phần lớn dùng điện thoại, trong những khoảng thời gian ngắn (đi tàu, giờ nghỉ, buổi tối).

## Product Purpose

HalloVN gom ba việc khó nhất của người Việt ở Đức — tiếng Đức, bằng lái, thi quốc tịch — vào một chỗ, có bản dịch tiếng Việt cho từng câu. Thành công là người dùng quay lại mỗi ngày và thi đậu.

## Positioning

Một tài khoản, miễn phí, viết cho người Việt: học tiếng Đức bằng video thật của người bản xứ (shadowing: nghe → nói theo → chép chính tả), cộng 1.100+ câu lý thuyết lái xe và 460 câu Leben in Deutschland đều có tiếng Việt.

## Operating Context

- Tiếng Đức: danh sách video theo trình độ, màn học shadowing (transcript, ghi âm, chính tả), sổ từ vựng, bộ thẻ từ, ôn từ, nói (Sprechen).
- Lái xe: học theo chương/hạng, câu sai, đánh dấu, đề mẫu, thi thử 30 câu (màn làm bài mô phỏng phần mềm thi thật), thống kê.
- Leben in Deutschland: chọn bang, chủ đề, thi thử 33 câu, câu sai, đánh dấu, thống kê.
- Bảng xếp hạng, kim cương chỉ kiếm từ học.
- Tài khoản, cài đặt, thống kê; khu admin (bài học, transcript, người dùng, góp ý); các trang thông tin/pháp lý.
- App mobile React Native riêng trong mobile/ (không thuộc phạm vi web).

## Capabilities and Constraints

- Next.js 16 (app router), React 19, Tailwind v4, lucide-react. Dữ liệu SQLite thật nằm trên VPS.
- Giao diện tiếng Việt; nội dung học có tiếng Đức.
- Giữ nguyên chức năng, API, DB và logic nghiệp vụ khi đổi giao diện.
- Có chế độ sáng/tối (mặc định: sáng, có nút chuyển sang tối).
- Màn làm bài Lái xe giữ tinh thần phần mềm thi thật — dùng chung hệ token/nút/chữ.

## Brand Commitments

- Tên: HalloVN. Không dùng CKK / Deutsch Shadowing / shadow-new trong giao diện (định danh kỹ thuật cũ giữ nguyên).
- Linh vật tắc kè (src/components/Mascot.tsx, public/mascot-*.svg) được giữ, làm nhân vật xuất hiện ở hero, empty state, loading, lỗi.
- Tính cách: vui nhưng không trẻ con, hiện đại nhưng ấm, chuyên nghiệp nhưng không cứng.

## Evidence on Hand

- Số liệu thật: 1.100+ câu lái xe hạng B, 460 câu LiD (300 chung + 10/bang), miễn phí.
- Chưa có người dùng thật ngoài chủ dự án (11/2026): không được bịa lời chứng thực, số người dùng hay đánh giá.

## Product Principles

1. Tiếng Việt trước: mọi câu đều hiểu được ngay, không bắt người học đoán.
2. Phiên học ngắn trên điện thoại là kịch bản chính.
3. Mỗi màu một nghĩa: đúng/sai/ghi âm/thưởng phải nhận ra tức thì.
4. Vui để quay lại, không vui để làm rối.

## Accessibility & Inclusion

Tương phản WCAG AA, vùng chạm ≥ 44px trên điện thoại, tôn trọng prefers-reduced-motion, dấu tiếng Việt hiển thị đầy đủ trong mọi font.
