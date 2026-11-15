# Cập nhật nội dung Führerschein

Backend là nguồn nội dung chính. App chỉ chứa bộ tiếng Đức khởi đầu, chữ giao diện
và các tài nguyên có sẵn. Bản dịch câu hỏi chỉ được tải khi người dùng bấm tải/cập nhật
ngôn ngữ đó trong Cài đặt. Đổi ngôn ngữ giao diện không tải dữ liệu.

## Dữ liệu và API

`content/laixe/catalog/manifest.json` trỏ tới các gói bất biến cùng thư mục:

- `q-<sha256>.json`: câu hỏi tiếng Đức, không chứa `translations` hoặc các trường `_vi`.
- `t-<sha256>.json`: bản dịch của **một** ngôn ngữ, có `questionsVersion`.
- `/api/fuehrerschein/version`: manifest, không cache.
- `/api/fuehrerschein/questions?version=q-...`: gói câu hỏi có phiên bản.
- `/api/fuehrerschein/translations/vi?version=t-...`: gói tiếng Việt có phiên bản.

Các gói có `schemaVersion: 2`; gói câu hỏi có `questions`, gói dịch có `language`,
`translations`, `count`, `questionsVersion`. Version dựa trên nội dung, không so sánh
ngày bằng toán tử lớn/nhỏ. Sửa bản dịch không đổi version câu hỏi.

Request không có `version` vẫn trả array câu hỏi / map bản dịch để tương thích app cũ.
App cũ chưa có giao diện tải riêng nên cần phát hành app mới để đổi hành vi.

## Xuất bản local

Chạy từ thư mục gốc repo HalloVN, dùng đường dẫn tuyệt đối cho dữ liệu đầu vào:

```sh
node tools/laixe-catalog/publish.mjs \
  --questions /absolute/work/questions.json \
  --translation vi=/absolute/work/vi.json \
  --translation en=/absolute/work/en.json \
  --date 2026-09-23
```

Chỉ sửa bản dịch tiếng Việt:

```sh
node tools/laixe-catalog/publish.mjs \
  --translation vi=/absolute/work/vi.json
```

Sửa/bổ sung một số câu trong các gói hiện tại:

```sh
node tools/laixe-catalog/publish.mjs \
  --patch /absolute/hallovn/tools/laixe-catalog/source/corrections/2026-09-23-complete-translations.json
```

File patch chứa `questionsVersion` và `translations: { lang: { questionId: translation } }`.
Version câu hỏi phải trùng manifest hiện tại. Lệnh giữ nguyên các mục không có trong patch,
kiểm tra toàn bộ gói sau khi ghép và tạo version bản dịch mới. Không kết hợp `--patch`
với `--questions` hoặc `--translation`.

Lệnh chỉ ghi **local**, không upload, không deploy. Review diff và triển khai backend
theo quy trình hiện tại, gồm cả các file trong `content/laixe/catalog/`.
`outputFileTracingIncludes` đưa các file này vào deployment của Next.

Không sửa trực tiếp gói `q-...`/`t-...`. Xuất gói mới rồi thay manifest.
Các file được ghi trước, manifest đổi sau cùng. Giữ gói cũ để request đã ghim version
vẫn thành công trong lúc cập nhật. Không chạy hai lệnh xuất bản đồng thời.
Rollback bằng cách khôi phục manifest đã lưu và giữ các gói mà nó tham chiếu.

Khi câu hỏi gốc thay đổi, các gói dịch cũ không được tự gắn sang version mới.
Chúng bị gỡ khỏi manifest mới; xuất bản lại những bản dịch đã kiểm tra với nguồn mới.
Mọi gói dịch được xuất bản phải đủ tất cả ID của bộ câu hỏi và khớp cấu trúc đáp án.
Thiếu câu, thừa ID, sai thứ tự đáp án hoặc metadata không khớp đều bị từ chối trước
khi ghi gói/manifest. Kiểm tra này áp dụng cả với các ngôn ngữ được giữ từ manifest cũ.
Đã bỏ `--skip-invalid` để không xuất bản thiếu câu một cách âm thầm.
App vẫn dùng tiếng Đức khi chưa tải bản dịch hoặc đang giữ một gói cũ không tương thích.

## Dịch tiếng Việt trên backend

`tools/laixe-catalog/translate-vi.mjs` đã chuyển từ app lái xe sang ckk-biz rồi sang repo HalloVN này. Nó chỉ xuất map bản dịch,
không ghi ngược vào câu hỏi hoặc tự công bố dữ liệu. Nguồn nhận array hoặc gói câu hỏi.

```sh
node tools/laixe-catalog/translate-vi.mjs \
  --questions /absolute/work/questions.json --output /absolute/work/vi.json --plan

node --env-file=/absolute/private/translation.env tools/laixe-catalog/translate-vi.mjs \
  --questions /absolute/work/questions.json --output /absolute/work/vi.json \
  --checkpoint /absolute/private/vi-checkpoint.json

node tools/laixe-catalog/translate-vi.mjs \
  --questions /absolute/work/questions.json --output /absolute/work/vi.json --audit
```

Lệnh dịch thật dùng `OPENAI_API_KEY` và có chi phí. `--plan`, `--audit`, `--apply-only`
không gọi OpenAI. Có thể tiếp tục checkpoint cũ của app bằng `--checkpoint`.
Không commit khóa API, file env hoặc `.translation-cache/`.
Kiểm tra nội dung dịch, rồi dùng lệnh xuất bản local ở trên.

## Bộ dữ liệu đã sửa đủ bản dịch

Bộ gốc giữ nguyên 1.191 câu tiếng Đức. Cả năm ngôn ngữ đều đủ 1.191 bản dịch:

| Ngôn ngữ | Số bản dịch | Còn thiếu |
| --- | ---: | ---: |
| Việt | 1191 | 0 |
| Anh | 1191 | 0 |
| Ả Rập | 1191 | 0 |
| Trung | 1191 | 0 |
| Nga | 1191 | 0 |

Lần chuyển dữ liệu đầu tiên đã lọc bỏ sáu câu nhập số ở bốn ngôn ngữ:
`2.6.06-103`, `1.2.34-011`, `2.2.03-109`, `2.7.05-108`, `2.2.03-026-M`, `2.2.03-110`.
Các bản dịch này nay có `options: []` đúng với dạng nhập số, nội dung và giải thích
được dịch theo nguồn tiếng Đức hiện tại. Không thay đổi đáp án gốc.

Gói Ả Rập đã bổ sung đủ A/B/C cho `2.1.06-018-M`, `021-M`, `023-M`, `024-M`,
`026-M`, `027-M`, `028-M`, `029-M` (cùng tiền tố `2.1.06-`).
Các phương án sai trong đề vẫn được dịch đúng nguyên văn, không sửa thành đáp án đúng.
Giải thích của `2.1.06-018-M` cũng đã sửa chủ thể: một xe khác vượt người lái, không phải ngược lại.

32 bản dịch được sửa được lưu tại `tools/laixe-catalog/source/corrections/2026-09-23-complete-translations.json`,
ràng buộc với version câu hỏi gốc. Các gói cũ vẫn giữ để tương thích request ghim version.
Version câu hỏi và bản dịch Việt không đổi. Chỉ version Anh/Ả Rập/Trung/Nga thay đổi.
Test kiểm tra độ đầy đủ, số liệu, ký tự giữ chỗ và thứ tự đáp án; không thay thế
việc duyệt ngôn ngữ của người bản ngữ.

Sau khi deploy bản sửa này, người dùng chỉ cần bấm cập nhật từng bản dịch đã tải
trong Cài đặt. Không cần cập nhật câu hỏi hoặc phát hành lại app.

## Trình tự rollout và kiểm tra

1. Deploy backend và các gói dữ liệu trước; kiểm tra ba API.
2. Phát hành app mới sau. Không cần sửa app cho những lần đổi nội dung sau đó.
3. Trên app: chọn giao diện Việt, câu hỏi vẫn tiếng Đức khi chưa tải gói Việt.
4. Tải Việt trong Cài đặt, mở lại app khi offline và xác nhận bản dịch hoạt động.
5. Sửa riêng một bản dịch, xuất bản, bấm cập nhật **Việt**; version câu hỏi không đổi.
6. Cập nhật câu hỏi: không tải thêm ngôn ngữ. Gói dịch không khớp sẽ dùng tiếng Đức
   đến khi người dùng tải gói tương thích.
7. Thử tải lỗi, hết dung lượng và xóa một gói. Câu hỏi offline và tiến trình học phải còn.

App lưu gói hoàn chỉnh trước khi đổi con trỏ cài đặt. Gói tiếng Đức đã tải ở app cũ
vẫn dùng được offline. Bản dịch cũ không có metadata nguồn phải tải lại một lần.
Hình mới dùng URL HTTPS khi chưa có asset; video mới dùng URL backend cung cấp.
Nếu đổi nội dung media, dùng tên/URL mới để tránh cache media cũ. Tải câu hỏi JSON
không đồng nghĩa tải toàn bộ hình/video để offline; video có màn hình tải riêng.

Kiểm thử: `npm run test:catalog`, `npx tsc --noEmit --incremental false`.
