"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import { oauthLogin } from "@/app/auth-actions";

// SDK của Google Identity Services / Sign in with Apple JS (nạp từ Google / Apple, chỉ phần cần dùng)
type GoogleId = {
  initialize(o: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: "popup"; context?: string }): void;
  renderButton(el: HTMLElement, o: Record<string, string | number>): void;
};
type AppleSignIn = {
  authorization: { id_token: string; code?: string };
  user?: { name?: { firstName?: string; lastName?: string } };
};
type AppleAuth = {
  init(o: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }): void;
  signIn(): Promise<AppleSignIn>;
};
let googleInitFor: string | null = null; // client ID đã khởi tạo SDK Google
let googleCallback: (r: { credential?: string }) => void = () => {};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
    AppleID?: { auth: AppleAuth };
  }
}

/**
 * Nút "Tiếp tục với Google" (nút chính thức của Google) + "Đăng nhập với Apple" trên trang đăng nhập / đăng ký.
 * Lấy ID token ngay trên trình duyệt (popup) rồi gửi server action oauthLogin — cùng cách kiểm tra với app.
 * Client ID null = server chưa cấu hình → ẩn nút đó.
 */
export default function SocialLogin({ google, apple, next }: { google: string | null; apple: string | null; next: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [appleReady, setAppleReady] = useState(false);
  const googleBox = useRef<HTMLDivElement>(null);

  const finish = async (provider: "google" | "apple", idToken: string, extra: { name?: string; code?: string } = {}) => {
    setPending(provider);
    setError("");
    // Thành công → server chuyển trang; chỉ quay lại đây khi có lỗi
    const err = await oauthLogin({ provider, idToken, next, ...extra });
    setError(err ?? "");
    setPending(null);
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  const initGoogle = () => {
    const box = googleBox.current;
    if (!google || !box || !window.google) return;
    // SDK chỉ khởi tạo 1 lần mỗi trang (quay lại trang đăng nhập chỉ vẽ lại nút); callback gọi qua biến toàn cục → luôn là bản mới nhất
    googleCallback = (r) => (r.credential ? void finishRef.current("google", r.credential) : setError("Google không trả về thông tin đăng nhập."));
    if (googleInitFor !== google) {
      window.google.accounts.id.initialize({ client_id: google, ux_mode: "popup", context: "signin", callback: (r) => googleCallback(r) });
      googleInitFor = google;
    }
    box.replaceChildren();
    window.google.accounts.id.renderButton(box, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "center",
      locale: "vi",
      width: Math.min(400, box.offsetWidth || 320), // Google giới hạn 400px
    });
  };

  const initApple = () => {
    if (!apple || !window.AppleID) return;
    // Return URL phải khai báo trong Services ID (Apple Developer); dùng popup nên trang không bị chuyển đi
    window.AppleID.auth.init({ clientId: apple, scope: "name email", redirectURI: `${location.origin}/login`, usePopup: true });
    setAppleReady(true);
  };

  const signInApple = async () => {
    if (!window.AppleID) return;
    try {
      const r = await window.AppleID.auth.signIn();
      const name = [r.user?.name?.firstName, r.user?.name?.lastName].filter(Boolean).join(" ");
      await finish("apple", r.authorization.id_token, { name: name || undefined, code: r.authorization.code });
    } catch (e) {
      const code = (e as { error?: string }).error;
      if (code === "popup_closed_by_user" || code === "user_cancelled_authorize") return; // người dùng tự đóng
      setError("Không đăng nhập được bằng Apple, thử lại.");
    }
  };

  if (!google && !apple) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs font-bold text-muted uppercase">
        <span className="h-px flex-1 bg-border" />
        hoặc
        <span className="h-px flex-1 bg-border" />
      </div>

      {google && (
        <>
          <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={initGoogle} />
          {/* Chỗ Google vẽ nút; giữ chiều cao để trang không nhảy khi nút hiện ra */}
          <div className={`flex h-10 justify-center ${pending ? "pointer-events-none opacity-50" : ""}`}>
            <div ref={googleBox} className="w-full max-w-[400px]" />
          </div>
        </>
      )}

      {apple && (
        <>
          <Script
            src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/vi_VN/appleid.auth.js"
            strategy="afterInteractive"
            onReady={initApple}
          />
          {/* Theo hướng dẫn của Apple: nút trắng chữ đen trên nền tối, logo Apple bên trái chữ */}
          <button
            type="button"
            onClick={signInApple}
            disabled={!appleReady || !!pending}
            className="mx-auto flex h-10 w-full max-w-[400px] cursor-pointer items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "apple" ? <Loader2 className="size-4 animate-spin" /> : <AppleLogo />}
            Đăng nhập với Apple
          </button>
        </>
      )}

      {pending === "google" && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Đang đăng nhập…
        </p>
      )}
      {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 814 1000" className="size-4 -translate-y-px" fill="currentColor" aria-hidden>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}
