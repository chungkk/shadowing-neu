import { getCurrentUser } from "@/lib/auth";
import { appleWebClientId, googleWebClientId } from "@/lib/oauth";
import { LoginDialog } from "./LoginDialog";

/** Chỗ đặt popup đăng nhập trong layout (đọc cookie lúc request → đặt trong <Suspense>); đã đăng nhập thì không cần */
export default async function LoginDialogSlot() {
  if (await getCurrentUser()) return null;
  return <LoginDialog social={{ google: googleWebClientId(), apple: appleWebClientId() }} />;
}
