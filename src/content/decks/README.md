# Bộ từ vựng (tab Từ vựng của app)

Mỗi bộ từ là 1 file JSON ở thư mục này. Thêm bộ mới:

1. Tạo `<slug>.json` theo mẫu dưới (xem `goethe-a1.json`).
2. Thêm 1 dòng `import` + đưa vào mảng `RAW` trong `src/lib/decks.ts`.
3. (Không bắt buộc) ảnh bìa: đặt vào `public/decks/<slug>.jpg` rồi ghi `"cover": "/decks/<slug>.jpg"`. Không có ảnh → app tự vẽ bìa theo trình độ.
4. Deploy lại server. App tự thấy bộ mới, không cần cập nhật app.

```json
{
  "slug": "a2-mua-sam",              // duy nhất, chỉ a-z 0-9 -
  "title": "Từ vựng Goethe B1",
  "description": "Mô tả ngắn hiện ở trang bộ từ",
  "category": "Bộ sách Goethe",       // các bộ cùng category nằm chung 1 mục trên app
  "level": "A2",                      // A1…C2 — màu bìa + nhãn trình độ
  "order": 10,                        // thứ tự: mục xếp theo bộ có order nhỏ nhất, trong mục xếp theo order
  "cover": "/decks/a2-mua-sam.jpg",   // không bắt buộc
  "words": [
    { "word": "der Preis", "plural": "Preise", "meaning": "giá", "example": "Der Preis ist zu hoch." },
    { "word": "kaufen", "meaning": "mua", "example": "Ich kaufe ein Brot." }
  ]
}
```

- `topics` + trường `topic` của từng từ (không bắt buộc): chia bộ thành các chủ đề — xem `goethe-a1.json`.
- `image` (không bắt buộc): hình minh hoạ `/emoji/<mã>.webp` — emoji 3D Fluent (Microsoft, MIT) trong `public/emoji/`, 160px WebP.
  Lấy ảnh mới: `https://github.com/microsoft/fluentui-emoji/tree/main/assets/<Tên>/3D`, rồi `cwebp -q 80 -resize 160 160 in.png -o public/emoji/<mã>.webp`.
  Không có ảnh → app dùng biểu tượng của chủ đề.
- Danh từ ghi kèm mạo từ (`der/die/das …`): app tô màu theo giống, lưu vào sổ đã có sẵn mạo từ.
- Từ viết thường / cụm nhiều từ được coi là không phải danh từ.
- Khi người học thêm từ vào sổ: từ đã có thì giữ nguyên mục cũ, chỉ điền nghĩa / mạo từ nếu mục cũ còn trống.

Có danh sách trong bảng tính? Xuất CSV (cột: word, plural, meaning, example) rồi chạy
`node scripts/csv-to-deck.mjs words.csv > src/content/decks/<slug>.json` để ra khung JSON, sau đó sửa slug / title / category / level.
