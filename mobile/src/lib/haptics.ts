import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Rung phản hồi theo đúng nghĩa của iOS HIG — dùng tiết chế, chỉ ở chỗ có kết quả hoặc thay đổi trạng thái:
 * - tap:     bấm nút chính, đổi tab con / segmented, chọn đáp án
 * - select:  đổi lựa chọn trong danh sách / picker
 * - success: đúng, lưu xong, đạt bài thi
 * - error:   sai, thao tác thất bại
 * - warn:    xác nhận thao tác nguy hiểm
 * Không bao giờ ném lỗi (máy không có Taptic Engine / web).
 */
const on = Platform.OS === "ios" || Platform.OS === "android";
const safe = (p: Promise<void>) => void p.catch(() => {});

export const haptic = {
  tap: () => on && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  firm: () => on && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  select: () => on && safe(Haptics.selectionAsync()),
  success: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warn: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
