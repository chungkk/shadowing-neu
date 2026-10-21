<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Phạm vi: app là sản phẩm, web chỉ là backend

Người dùng chỉ học trên app mobile (`mobile/`, Expo). Phần Next.js ở thư mục gốc chỉ đóng vai trò backend: API (`src/app/api/`), database, logic dùng chung (`src/lib/`) và trang quản trị. Người dùng không vào web để học.

- Yêu cầu tính năng, sửa giao diện, sửa trải nghiệm học → chỉ sửa trong `mobile/`.
- Chỉ sửa phía web khi app thật sự cần: thêm/sửa API, schema DB, logic server, hoặc `src/lib/` mà app import qua `@shared/*`.
- Không sửa hay làm mới các trang/component giao diện web dành cho người học (vd. `src/app/vocab`, `src/components/VocabReview.tsx`), kể cả khi chúng dùng chung logic với app. Logic dùng chung trong `src/lib/` đổi thì chỉ cần giữ web vẫn build được (typecheck), không cần cập nhật giao diện web theo.
- Khi không rõ một thay đổi thuộc app hay web, mặc định làm ở app.
