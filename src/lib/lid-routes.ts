// Đường dẫn của phần Leben in Deutschland — file nhẹ (không đọc bộ câu hỏi, không server-only) để proxy.ts dùng được.
// lib/lid.ts kiểm lúc chạy rằng các hằng số này khớp dữ liệu.

export const LID_BASE = "/leben-in-deutschland";
export const LID_STATE_CODES = ["bw", "by", "be", "bb", "hb", "hh", "he", "mv", "ni", "nw", "rp", "sl", "sn", "st", "sh", "th"] as const;
export const LID_TOPIC_KEYS = ["politik", "geschichte", "gesellschaft"] as const;
export const LID_SET_COUNT = 10; // 300 câu chung / 30 câu mỗi bộ

/** Mọi giá trị hợp lệ của /leben-in-deutschland/[set] */
export const LID_SET_IDS: readonly string[] = [
  "hoc",
  "tat-ca",
  ...LID_TOPIC_KEYS,
  ...Array.from({ length: LID_SET_COUNT }, (_, i) => String(i + 1)),
  ...LID_STATE_CODES,
];

/** Trang con cố định (không phải [set]) */
export const LID_PAGES = ["chu-de", "thi-thu", "cau-sai", "danh-dau", "thong-ke", "cai-dat"] as const;

/** Trang cần đăng nhập: chưa có cookie phiên thì proxy chuyển sang /login (HTTP 307 thật, thay vì chuyển hướng giữa luồng stream) */
export const LID_PRIVATE = /^\/leben-in-deutschland\/(cau-sai|danh-dau|thong-ke|thi-thu\/\d+)\/?$/;
