import type { ImageSource } from "expo-image";
import { API_URL } from "../api";
import { LAIXE_IMAGES, LID_IMAGES } from "./media-map";

/**
 * Ảnh câu hỏi: dùng bản đóng gói trong app nếu có (scripts/import-quiz-media.mjs);
 * chưa có thì tải URL gốc — expo-image giữ lại trên ổ đĩa, lần sau xem không cần mạng.
 */
export function quizImage(src: string): number | ImageSource {
  const bundled = LAIXE_IMAGES[src] ?? LID_IMAGES[src];
  if (bundled) return bundled;
  return { uri: hallovnMedia(src), cacheKey: src };
}

// Media câu hỏi do chính hallovn.de phục vụ, không tải từ ckk.biz (dự án riêng) — giống localMedia của web
// (src/lib/laixe/index.ts). Khoá của ảnh đóng gói (media-map) vẫn là URL gốc nên chỉ đổi lúc tải từ mạng.
const CKK_IMAGES = "https://ckk.biz/ckk/images/";
const CKK_MEDIA = "https://ckk.biz/download/media/";
export function hallovnMedia(url: string): string {
  if (url.startsWith(CKK_IMAGES)) return `${API_URL}/ckk/images/${url.slice(CKK_IMAGES.length)}`;
  if (url.startsWith(CKK_MEDIA)) return `${API_URL}/download/media/${url.slice(CKK_MEDIA.length)}`;
  return url.startsWith("/") ? API_URL + url : url;
}
