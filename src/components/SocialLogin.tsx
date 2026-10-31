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
 * Nút "Tiếp tục với Google" (nút chính thức của Google) + "Đăng nhập với Apple" ở đầu trang đăng nhập / đăng ký,
 * bên dưới là đường kẻ "hoặc tiếp tục với email".
 * Lấy ID token ngay trên trình duyệt (popup) rồi gửi server action oauthLogin — cùng cách kiểm tra với app.
 * Client ID null = server chưa cấu hình → ẩn nút đó.
 */
export default function SocialLogin({
  google,
  apple,
  next,
  onDone,
}: {
  google: string | null;
  apple: string | null;
  next: string;
  onDone?: () => void; // có = đăng nhập trong popup: xong thì gọi hàm này, ở lại trang đang xem
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [appleReady, setAppleReady] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleBox = useRef<HTMLDivElement>(null);

  const finish = async (provider: "google" | "apple", idToken: string, extra: { name?: string; code?: string } = {}) => {
    setPending(provider);
    setError("");
    // Thành công → server chuyển trang (popup: trả "" rồi đóng popup); không thì là lỗi
    const err = await oauthLogin({ provider, idToken, next, stay: !!onDone, ...extra });
    setPending(null);
    if (!err) return onDone?.();
    setError(err);
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
      size: "large",
      text: "continue_with",
      locale: "vi",
      width: Math.min(400, box.offsetWidth || 320), // Google giới hạn 400px
    });
    setGoogleReady(true);
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
      {google && (
        <>
          <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={initGoogle} />
          {/* Nút Google vẽ sẵn không đổi được kiểu cho hợp giao diện → hiện nút của mình,
              nút thật của Google nằm vô hình phủ lên trên (phóng to cho kín) để nhận cú bấm */}
          <div className={`group relative ${pending || !googleReady ? "pointer-events-none opacity-50" : ""}`}>
            <div
              aria-hidden
              className="btn w-full border-white bg-white py-3 text-[15px] text-neutral-900 group-focus-within:border-accent group-hover:border-accent"
            >
              {pending === "google" ? <Loader2 className="size-5 animate-spin" /> : <GoogleLogo />}
              Tiếp tục với Google
            </div>
            <div className="absolute inset-0 overflow-hidden opacity-0">
              <div ref={googleBox} className="flex h-full scale-150 items-center justify-center" />
            </div>
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
          {/* Cùng kiểu với nút Google; logo Apple bên trái chữ */}
          <button type="button" onClick={signInApple} disabled={!appleReady || !!pending} className="btn w-full py-3 text-[15px]">
            {pending === "apple" ? <Loader2 className="size-5 animate-spin" /> : <AppleLogo />}
            Tiếp tục với Apple
          </button>
        </>
      )}

      {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}

      <div className="mt-1 flex items-center gap-3 text-xs font-bold text-muted uppercase">
        <span className="h-px flex-1 bg-border" />
        hoặc tiếp tục với email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 814 1000" className="size-4 -translate-y-px" fill="currentColor" aria-hidden>
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}
