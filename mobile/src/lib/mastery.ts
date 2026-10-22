import { masteryOf, type Mastery } from "@shared/srs";
import type { TFn } from "./i18n";
import { C } from "./theme";

/** Trạng thái thành thạo của 1 mục (server cũ chưa gửi → suy từ mức nhớ, chưa tính là đã chứng minh) */
export const masteryOfItem = (v: { stage: number; mastery?: Mastery }): Mastery => v.mastery ?? masteryOf(v.stage, false);

/** Trạng thái → nhãn + màu: Mới lưu · Đang học · Chủ động · Thành thạo */
export function masteryMeta(m: Mastery, t: TFn) {
  if (m === "saved") return { label: t("review.stage.new"), color: C.muted };
  if (m === "learning") return { label: t("review.stage.learning"), color: C.redText };
  if (m === "active") return { label: t("review.stage.good"), color: C.amber };
  return { label: t("review.stage.mastered"), color: C.accent };
}
