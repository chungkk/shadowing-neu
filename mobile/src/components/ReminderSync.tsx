import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/lib/auth";
import { pathFromResponse, syncDailyReminder } from "@/lib/reminders";

// Thông báo đến lúc đang mở app vẫn hiện banner (mặc định iOS sẽ ẩn)
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * Không vẽ gì: giữ thông báo nhắc học hằng ngày luôn đúng tiến độ (đặt lại khi mở app, quay lại app, đăng nhập / đăng xuất)
 * và mở đúng màn hình khi người dùng chạm vào thông báo (cả lúc app đang tắt hẳn).
 */
export function ReminderSync() {
  const { user } = useAuth();
  const loggedIn = !!user;

  useEffect(() => {
    syncDailyReminder(loggedIn);
    const sub = AppState.addEventListener("change", (s) => s === "active" && syncDailyReminder(loggedIn));
    return () => sub.remove();
  }, [loggedIn]);

  useEffect(() => {
    const open = (res: Notifications.NotificationResponse | null) => {
      const path = pathFromResponse(res);
      if (!path) return;
      router.push(path as never);
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    // App được mở từ thông báo khi đang tắt hẳn
    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  return null;
}
