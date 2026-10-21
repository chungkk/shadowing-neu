import { Platform } from "react-native";
import type * as AppleAuth from "expo-apple-authentication";
import type * as GoogleAuth from "@react-native-google-signin/google-signin";

/**
 * Đăng nhập bằng Apple / Google qua SDK native → ID token gửi lên server (/auth/oauth).
 * SDK nạp lúc cần, lỗi thì coi như không có: bản app cũ (chưa build lại với module native) nhận bản cập nhật JS
 * vẫn chạy, chỉ ẩn nút.
 */

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

function load<T>(get: () => T): T | null {
  try {
    return get();
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports -- nạp lười, thiếu module native thì bỏ qua
export const apple = Platform.OS === "ios" ? load(() => require("expo-apple-authentication") as typeof AppleAuth) : null;

let googleReady = false;
function google(): typeof GoogleAuth | null {
  // Web client ID: để ID token có aud = Web client ID (server kiểm tra); iOS cần thêm iOS client ID
  if (!GOOGLE_WEB_CLIENT_ID || (Platform.OS === "ios" && !GOOGLE_IOS_CLIENT_ID)) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- nạp lười như trên
  const g = load(() => require("@react-native-google-signin/google-signin") as typeof GoogleAuth);
  if (g && !googleReady) {
    g.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
    googleReady = true;
  }
  return g;
}

export const googleAvailable = () => !!google();

/** Kết quả đăng nhập; null = người dùng tự huỷ */
export type SocialResult = { idToken: string; name?: string; authorizationCode?: string } | null;

export async function signInWithApple(): Promise<SocialResult> {
  if (!apple) throw new Error("Sign in with Apple");
  try {
    const c = await apple.signInAsync({
      requestedScopes: [apple.AppleAuthenticationScope.FULL_NAME, apple.AppleAuthenticationScope.EMAIL],
    });
    if (!c.identityToken) throw new Error("Apple");
    // Apple chỉ gửi tên ở lần đăng nhập đầu tiên
    const name = [c.fullName?.givenName, c.fullName?.familyName].filter(Boolean).join(" ");
    return { idToken: c.identityToken, name: name || undefined, authorizationCode: c.authorizationCode ?? undefined };
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw e;
  }
}

export async function signInWithGoogle(): Promise<SocialResult> {
  const g = google();
  if (!g) throw new Error("Google");
  try {
    await g.GoogleSignin.hasPlayServices();
    const r = await g.GoogleSignin.signIn();
    if (!g.isSuccessResponse(r)) return null; // huỷ
    if (!r.data.idToken) throw new Error("Google");
    return { idToken: r.data.idToken, name: r.data.user.name ?? undefined };
  } catch (e) {
    if (g.isErrorWithCode(e) && (e.code === g.statusCodes.SIGN_IN_CANCELLED || e.code === g.statusCodes.IN_PROGRESS)) return null;
    throw e;
  }
}

/** Đăng xuất phía Google (lần sau được chọn tài khoản khác) — không có Google thì bỏ qua */
export function signOutGoogle() {
  if (googleReady) google()?.GoogleSignin.signOut().catch(() => {});
}
