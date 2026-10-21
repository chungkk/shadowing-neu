import "server-only";
import { createPrivateKey, createPublicKey, sign, verify, type JsonWebKey, type KeyObject } from "node:crypto";
import type { OAuthProvider } from "./db";

/**
 * Đăng nhập bằng Google / Apple: app lấy ID token (JWT) từ Google / Apple rồi gửi lên,
 * server tự kiểm tra chữ ký bằng khoá công khai của họ (không cần thư viện).
 *
 * Biến môi trường:
 * - GOOGLE_CLIENT_IDS: các OAuth client ID của Google được chấp nhận (cách nhau dấu phẩy) — Web client ID dùng trong app
 * - APPLE_CLIENT_IDS: bundle ID của app iOS (mặc định com.chungkk.deutschshadowing)
 * - APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (.p8): để thu hồi quyền Sign in with Apple khi xoá tài khoản (tuỳ chọn)
 */

const PROVIDERS = {
  google: {
    jwks: "https://www.googleapis.com/oauth2/v3/certs",
    issuers: ["https://accounts.google.com", "accounts.google.com"],
    audiences: () => list(process.env.GOOGLE_CLIENT_IDS),
  },
  apple: {
    jwks: "https://appleid.apple.com/auth/keys",
    issuers: ["https://appleid.apple.com"],
    audiences: () => list(process.env.APPLE_CLIENT_IDS ?? "com.chungkk.deutschshadowing"),
  },
} satisfies Record<OAuthProvider, unknown>;

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export const oauthEnabled = (p: OAuthProvider) => PROVIDERS[p].audiences().length > 0;

// ---- Khoá công khai (JWKS), lưu 1 giờ; gặp khoá lạ (Google / Apple vừa đổi khoá) thì tải lại ----

const keyCache = new Map<OAuthProvider, { keys: Map<string, KeyObject>; at: number }>();

async function publicKey(p: OAuthProvider, kid: string): Promise<KeyObject | null> {
  const cached = keyCache.get(p);
  if (cached && Date.now() - cached.at < 3600_000 && cached.keys.has(kid)) return cached.keys.get(kid)!;
  if (cached && Date.now() - cached.at < 60_000) return cached.keys.get(kid) ?? null; // vừa tải → không tải lại liên tục
  const res = await fetch(PROVIDERS[p].jwks, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Không tải được khoá ${p} (${res.status})`);
  const { keys } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
  const map = new Map(keys.map((k) => [k.kid, createPublicKey({ key: k, format: "jwk" })]));
  keyCache.set(p, { keys: map, at: Date.now() });
  return map.get(kid) ?? null;
}

export type OAuthProfile = { subject: string; email: string; emailVerified: boolean; name: string };

const b64json = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

/** Kiểm tra ID token → thông tin người dùng, hoặc chuỗi lỗi */
export async function verifyIdToken(p: OAuthProvider, token: string): Promise<OAuthProfile | string> {
  const invalid = "Đăng nhập không hợp lệ, thử lại.";
  const parts = token.split(".");
  if (parts.length !== 3 || token.length > 8192) return invalid;
  let header: { alg?: string; kid?: string };
  let claims: Record<string, unknown>;
  try {
    header = b64json(parts[0]);
    claims = b64json(parts[1]);
  } catch {
    return invalid;
  }
  if (header.alg !== "RS256" || !header.kid) return invalid;
  const key = await publicKey(p, header.kid);
  if (!key || !verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url"))) return invalid;

  const cfg = PROVIDERS[p];
  const now = Date.now() / 1000;
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!cfg.issuers.includes(String(claims.iss))) return invalid;
  if (!aud.some((a) => cfg.audiences().includes(String(a)))) return invalid;
  if (typeof claims.exp !== "number" || claims.exp < now - 60) return "Phiên đăng nhập đã hết hạn, thử lại.";
  if (typeof claims.sub !== "string" || !claims.sub) return invalid;

  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  return {
    subject: claims.sub,
    email,
    // Apple trả "true" (chuỗi) hoặc true
    emailVerified: !!email && (claims.email_verified === true || claims.email_verified === "true"),
    name: typeof claims.name === "string" ? claims.name.trim() : "",
  };
}

// ---- Apple: đổi authorizationCode lấy refresh token, thu hồi khi xoá tài khoản ----

const appleKeyConfigured = () => !!(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
const appleClientId = () => PROVIDERS.apple.audiences()[0];

/** client_secret của Apple: JWT ký ES256 bằng khoá .p8 */
function appleClientSecret(): string {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = `${enc({ alg: "ES256", kid: process.env.APPLE_KEY_ID })}.${enc({
    iss: process.env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 300,
    aud: "https://appleid.apple.com",
    sub: appleClientId(),
  })}`;
  const pem = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n"); // biến môi trường 1 dòng: "\n" viết tay
  const sig = sign("SHA256", Buffer.from(body), { key: createPrivateKey(pem), dsaEncoding: "ieee-p1363" });
  return `${body}.${sig.toString("base64url")}`;
}

async function appleRequest(path: "token" | "revoke", params: Record<string, string>) {
  return fetch(`https://appleid.apple.com/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: appleClientId(), client_secret: appleClientSecret(), ...params }),
    signal: AbortSignal.timeout(10_000),
  });
}

/** authorizationCode (lần đăng nhập Apple) → refresh token, null nếu chưa cấu hình khoá hoặc lỗi */
export async function appleRefreshToken(code: string): Promise<string | null> {
  if (!appleKeyConfigured() || !code) return null;
  try {
    const res = await appleRequest("token", { code, grant_type: "authorization_code" });
    const data = (await res.json()) as { refresh_token?: string };
    return data.refresh_token ?? null;
  } catch (e) {
    console.error("[apple] đổi authorizationCode lỗi:", (e as Error).message);
    return null;
  }
}

/** Thu hồi quyền Sign in with Apple (khi xoá tài khoản) — lỗi thì chỉ ghi log */
export async function revokeApple(refreshToken: string) {
  if (!appleKeyConfigured()) return;
  try {
    await appleRequest("revoke", { token: refreshToken, token_type_hint: "refresh_token" });
  } catch (e) {
    console.error("[apple] thu hồi lỗi:", (e as Error).message);
  }
}
