import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "./api";
import { currentLang, t } from "./i18n";
import { getPrefs } from "./quiz/store";
import { loadReminderMutes, type ReminderSection } from "./reminderPrefs";

/**
 * Nhắc học hằng ngày bằng thông báo CỤC BỘ (lên lịch ngay trên máy — không cần máy chủ push / APNs).
 * Mỗi lần mở app / quay lại app: lấy GET /api/v1/reminders (chung với chuông trên web) → đặt lại 1 thông báo
 * lặp mỗi ngày vào giờ người dùng chọn, nội dung là việc đang dở quan trọng nhất. Chạm thông báo → mở đúng màn hình.
 * Giới hạn: nội dung là ảnh chụp lúc mở app gần nhất (không mở app nhiều ngày → nội dung cũ, nhưng vẫn nhắc).
 */

/** Giống src/lib/reminders.ts của web (chỉ các trường app dùng) */
export type Reminder = {
  id: string;
  section: ReminderSection;
  kind: "streak" | "review" | "lesson" | "deck" | "chapter" | "wrong";
  ref?: string;
  title: string;
  detail: string;
  href: string;
  percent?: number;
  at?: number;
  daily?: boolean;
  level?: number;
  quiet?: boolean;
};

export type DailyPrefs = { on: boolean; hour: number; minute: number };
export const DEFAULT_DAILY: DailyPrefs = { on: false, hour: 19, minute: 0 };
export const DAILY_HOURS = [8, 12, 19, 21]; // các giờ chọn nhanh trong Cài đặt

const PREFS_KEY = "daily-reminder";
const NOTIF_ID = "daily-reminder"; // identifier cố định → đặt lại là thay thế, không bị nhân bản
const CHANNEL = "reminders";

export async function loadDailyPrefs(): Promise<DailyPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<DailyPrefs>) : {};
    const hour = Number.isInteger(p.hour) && p.hour! >= 0 && p.hour! < 24 ? p.hour! : DEFAULT_DAILY.hour;
    const minute = Number.isInteger(p.minute) && p.minute! >= 0 && p.minute! < 60 ? p.minute! : DEFAULT_DAILY.minute;
    return { on: p.on === true, hour, minute };
  } catch {
    return DEFAULT_DAILY;
  }
}

export const saveDailyPrefs = (p: DailyPrefs) => SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(p)).catch(() => {});

/** Xin quyền thông báo (chỉ khi người dùng tự bật trong Cài đặt) → true nếu được phép */
export async function ensurePermission(): Promise<boolean> {
  // Android 13+: phải có kênh thì hộp xin quyền mới hiện
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: t("remind.channel"), importance: AndroidImportance.DEFAULT });
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted || cur.ios?.status === IosAuthorizationStatus.PROVISIONAL) return true;
  if (!cur.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted || req.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

/** Màn hình của app ứng với 1 nhắc nhở (href của server là đường dẫn web — app tự đổi theo kind + ref) */
export function pathOfReminder(r: Reminder): string {
  switch (r.kind) {
    case "review":
      return "/review";
    case "streak":
      return r.href.includes("review") ? "/review" : "/"; // có từ đến hạn → ôn luôn, không thì về trang Tiếng Đức
    case "lesson":
      return r.ref ?? "/"; // "/lesson/3" | "/watch/<videoId>" — trùng route của app
    case "deck":
      return r.ref ? `/deck/${encodeURIComponent(r.ref)}` : "/vocab";
    case "chapter": {
      const module = r.section === "lid" ? "lid" : "fuehrerschein";
      // LiD: bộ câu "1".."10"; bộ 10 câu của bang trên app có scope "state" (web dùng mã bang)
      const scope = r.section === "lid" && r.ref && !/^\d+$/.test(r.ref) ? "state" : (r.ref ?? "all");
      return `/quiz/run?module=${module}&mode=ueben&scope=${encodeURIComponent(scope)}`;
    }
    case "wrong":
      return `/quiz/run?module=${r.section === "lid" ? "lid" : "fuehrerschein"}&mode=ueben&scope=wrong`;
  }
}

/** Nội dung thông báo: việc quan trọng nhất (chuỗi ngày / ôn từ trước, rồi việc dở gần nhất) + đếm số việc còn lại */
function contentOf(list: Reminder[]): Notifications.NotificationContentInput | null {
  const top = list[0];
  if (!top) return null;
  const more = list.length - 1;
  // Tiêu đề / mô tả của server là tiếng Việt → giao diện tiếng Đức dùng câu chung
  const body = currentLang() === "vi" ? `${top.title} — ${top.detail}` : t("remind.genericBody");
  return {
    title: more > 0 ? t("remind.titleMore", { n: more }) : t("remind.title"),
    body,
    data: { path: pathOfReminder(top) },
  };
}

let running: Promise<void> | null = null;
let queuedLoggedIn: boolean | null = null;

/**
 * Đặt lại thông báo hằng ngày theo tiến độ mới nhất. Gọi khi mở app / quay lại app / đổi cài đặt / đăng nhập, đăng xuất.
 * loggedIn = false hoặc tắt nhắc → huỷ thông báo. Lỗi mạng → giữ thông báo đã đặt (nội dung cũ vẫn hơn không nhắc).
 */
export function syncDailyReminder(loggedIn: boolean): Promise<void> {
  if (running) {
    queuedLoggedIn = loggedIn;
    return running;
  }
  running = (async () => {
    try {
      const prefs = await loadDailyPrefs();
      if (!loggedIn || !prefs.on) {
        await Notifications.cancelScheduledNotificationAsync(NOTIF_ID).catch(() => {});
        return;
      }
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted && perm.ios?.status !== IosAuthorizationStatus.PROVISIONAL) return; // không tự xin quyền ở đây — chỉ khi bật trong Cài đặt
      const { cls, state } = getPrefs();
      const [r, mutes] = await Promise.all([
        api<{ reminders: Reminder[] }>(`/reminders?tz=${new Date().getTimezoneOffset()}&cls=${cls}&state=${state}&lang=${currentLang()}`),
        loadReminderMutes(),
      ]);
      const content = contentOf(r.reminders.filter((x) => !mutes[x.section] && (!x.quiet || x.kind === "review")));
      await Notifications.cancelScheduledNotificationAsync(NOTIF_ID).catch(() => {});
      if (!content) return; // không có việc dở → hôm nay không nhắc
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIF_ID,
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: prefs.hour, minute: prefs.minute, channelId: CHANNEL },
      });
    } catch {
      // mất mạng / server lỗi → giữ thông báo đã đặt lần trước
    } finally {
      running = null;
      if (queuedLoggedIn !== null) {
        const next = queuedLoggedIn;
        queuedLoggedIn = null;
        void syncDailyReminder(next);
      }
    }
  })();
  return running;
}

/** Đường dẫn trong dữ liệu thông báo (chỉ nhận đường dẫn nội bộ của app) */
export function pathFromResponse(res: Notifications.NotificationResponse | null | undefined): string | null {
  const p = res?.notification.request.content.data?.path;
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : null;
}
