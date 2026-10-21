import * as SecureStore from "expo-secure-store";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, API_URL, setApiToken, type User } from "./api";
import { currentLang, isLang, useI18n, type Lang } from "./i18n";
import { signOutGoogle } from "./social";

/**
 * Đăng nhập: token lưu trong Keychain (expo-secure-store), gửi kèm mọi request API.
 * - Mở app: hiện ngay tài khoản đã lưu trên máy, rồi hỏi server (/me) để cập nhật + nhận token mới (gia hạn 30 ngày).
 * - Chỉ đăng xuất khi server trả 401 (token hết hạn / đổi mật khẩu / tài khoản bị xoá);
 *   mất mạng hay server đang khởi động lại thì vẫn giữ đăng nhập.
 * - Token gắn với địa chỉ server: chạy thử với server khác (localhost) không làm mất đăng nhập thật.
 * Ngôn ngữ giao diện lưu theo tài khoản: đăng nhập → dùng ngôn ngữ của tài khoản; đổi ngôn ngữ → lưu lên server.
 */

const KEY = "auth-token";
const USER_KEY = "auth-user"; // thông tin tài khoản lần gần nhất (hiện ngay khi mở app, kể cả lúc mất mạng)
const SERVER_KEY = "auth-server"; // server đã cấp token

type Auth = {
  user: User | null;
  ready: boolean; // đã đọc xong token đã lưu
  login: (email: string, password: string) => Promise<void>;
  /** Đăng nhập / tự tạo tài khoản bằng ID token Google / Apple (lấy từ SDK native) */
  oauthLogin: (provider: "google" | "apple", idToken: string, extra?: { name?: string; authorizationCode?: string }) => Promise<void>;
  /** Gửi mã xác nhận về email (bước 1 đăng ký) */
  sendSignupCode: (name: string, email: string, password: string) => Promise<void>;
  /** Quên mật khẩu: gửi mã đặt lại về email */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Đặt mật khẩu mới bằng mã → đăng nhập luôn */
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  /** Tạo tài khoản với mã đã nhận (bước 2) */
  register: (name: string, email: string, password: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
  setToken: (t: string) => Promise<void>;
  /** Đổi ngôn ngữ giao diện (đang đăng nhập → lưu vào tài khoản) */
  changeLang: (l: Lang) => void;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const { setLang } = useI18n();

  /** Cập nhật tài khoản và lưu lại trên máy */
  const remember = useCallback((u: User) => {
    setUserState(u);
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(u)).catch(() => {});
  }, []);

  /** Nhận thông tin tài khoản: áp dụng ngôn ngữ đã lưu, hoặc lưu ngôn ngữ đang dùng nếu tài khoản chưa có */
  const setUser = useCallback(
    (u: User) => {
      remember(u);
      if (isLang(u.lang)) setLang(u.lang);
      else api("/me", { method: "PATCH", body: { lang: currentLang() } }).catch(() => {});
    },
    [remember, setLang],
  );

  const setToken = useCallback(async (t: string | null) => {
    setApiToken(t);
    if (t) {
      await SecureStore.setItemAsync(KEY, t);
      await SecureStore.setItemAsync(SERVER_KEY, API_URL);
    } else {
      await Promise.all([KEY, USER_KEY, SERVER_KEY].map((k) => SecureStore.deleteItemAsync(k)));
    }
  }, []);

  // Mở app: hiện ngay tài khoản đã lưu, rồi kiểm tra với server
  useEffect(() => {
    (async () => {
      const [saved, server, cached] = await Promise.all(
        [KEY, SERVER_KEY, USER_KEY].map((k) => SecureStore.getItemAsync(k).catch(() => null)),
      );
      // Token của server khác (vd. đang chạy thử với localhost) → không dùng, cũng không xoá
      if (!saved || (server && server !== API_URL)) {
        setReady(true);
        return;
      }
      setApiToken(saved);
      if (cached) {
        try {
          const u = JSON.parse(cached) as User;
          setUserState(u);
          if (isLang(u.lang)) setLang(u.lang);
          setReady(true);
        } catch {}
      }
      try {
        const r = await api<{ user: User; token?: string }>("/me");
        if (r.token) await setToken(r.token); // gia hạn thêm 30 ngày
        setUser(r.user);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await setToken(null); // hết hạn / đã đổi mật khẩu / tài khoản bị xoá
          setUserState(null);
        }
        // Lỗi mạng / server tạm lỗi → giữ đăng nhập
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lúc mở app
  }, []);

  const value = useMemo<Auth>(
    () => ({
      user,
      ready,
      login: async (email, password) => {
        const r = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password } });
        await setToken(r.token);
        setUser(r.user);
      },
      oauthLogin: async (provider, idToken, extra) => {
        const r = await api<{ token: string; user: User }>("/auth/oauth", {
          method: "POST",
          body: { provider, idToken, ...extra, lang: currentLang() },
        });
        await setToken(r.token);
        setUser(r.user);
      },
      sendSignupCode: async (name, email, password) => {
        await api("/auth/register/code", { method: "POST", body: { name, email, password, lang: currentLang() } });
      },
      sendPasswordReset: async (email) => {
        await api("/auth/forgot", { method: "POST", body: { email, lang: currentLang() } });
      },
      resetPassword: async (email, code, password) => {
        const r = await api<{ token: string; user: User }>("/auth/reset", { method: "POST", body: { email, code, password } });
        await setToken(r.token);
        setUser(r.user);
      },
      register: async (name, email, password, code) => {
        const r = await api<{ token: string; user: User }>("/auth/register", {
          method: "POST",
          body: { name, email, password, code, lang: currentLang() },
        });
        await setToken(r.token);
        setUser(r.user);
      },
      logout: async () => {
        signOutGoogle(); // lần sau được chọn lại tài khoản Google
        await setToken(null);
        setUserState(null);
      },
      setUser: remember,
      setToken: (t: string) => setToken(t),
      changeLang: (l) => {
        setLang(l);
        if (user) api<{ user: User }>("/me", { method: "PATCH", body: { lang: l } }).then((r) => remember(r.user), () => {});
      },
    }),
    [user, ready, setToken, setUser, setLang, remember],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const a = use(AuthContext);
  if (!a) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return a;
}
