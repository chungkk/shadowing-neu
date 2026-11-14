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
  return { uri: src.startsWith("/") ? API_URL + src : src, cacheKey: src };
}
