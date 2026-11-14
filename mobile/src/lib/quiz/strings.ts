import { useCallback } from "react";
import { currentLang, useI18n } from "../i18n";

/**
 * Chữ giao diện của tab Lái xe / LiD theo ngôn ngữ app (Tiếng Việt · Deutsch), viết cạnh nhau ngay chỗ dùng:
 * L("Câu sai", "Falsche Fragen"). Câu hỏi luôn bằng tiếng Đức, bản dịch chọn riêng trong Cài đặt của từng phần.
 */
export type L = (vi: string, de: string) => string;

export function useL(): L {
  const { lang } = useI18n();
  return useCallback((vi: string, de: string) => (lang === "de" ? de : vi), [lang]);
}

/** Dùng ngoài React (hộp thoại) */
export const l: L = (vi, de) => (currentLang() === "de" ? de : vi);
