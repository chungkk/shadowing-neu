import { router } from "expo-router";
import { Alert, Linking } from "react-native";
import { t } from "./i18n";

/**
 * Hộp thoại dùng chung — mọi popup trong app theo cùng quy tắc:
 * - Luôn có tiêu đề ngắn (chuyện gì / câu hỏi) + nội dung giải thích hậu quả hoặc cách xử lý.
 * - Lỗi: "Không thực hiện được" + chi tiết lỗi, 1 nút OK.
 * - Thao tác không hoàn tác được: "Huỷ" + nút hành động màu đỏ gọi đúng tên động từ.
 * - Cần tài khoản: "Để sau" + "Đăng nhập / Đăng ký". Thiếu quyền: "Huỷ" + "Mở Cài đặt".
 */

/** Lỗi khi gọi server / thao tác thất bại */
export function showError(e: unknown, title = t("dialog.errorTitle")) {
  Alert.alert(title, e instanceof Error ? e.message : String(e), [{ text: t("dialog.ok") }]);
}

/** Thông báo 1 nút (không phải lỗi) */
export function notice(title: string, message?: string) {
  Alert.alert(title, message, [{ text: t("dialog.ok") }]);
}

/** Xác nhận thao tác không hoàn tác được (xoá, đăng xuất…) */
export function confirmDestructive(title: string, message: string, action: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: t("cancel"), style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

/** Tính năng cần tài khoản → mở tab Tài khoản */
export function askLogin(title: string, message: string, beforeNavigate?: () => void) {
  Alert.alert(title, message, [
    { text: t("later"), style: "cancel" },
    {
      text: t("loginOrRegister"),
      onPress: () => {
        beforeNavigate?.();
        router.push("/account");
      },
    },
  ]);
}

/** Bị từ chối quyền micro → hướng dẫn + nút mở Cài đặt của app */
export function micDenied() {
  Alert.alert(t("player.micDenied"), t("player.micDeniedBody"), [
    { text: t("cancel"), style: "cancel" },
    { text: t("dialog.openSettings"), onPress: () => Linking.openSettings().catch(() => {}) },
  ]);
}
