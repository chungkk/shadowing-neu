import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LoginLink } from "./LoginDialog";
import Sidebar from "./Sidebar";

/** Thanh bên có thông tin người dùng (đọc cookie lúc request → đặt trong <Suspense>) */
export async function SidebarWithUser() {
  const user = await getCurrentUser();
  return <Sidebar user={user && { name: user.name, role: user.role }} />;
}

/** Góc phải thanh trên cùng: nút đăng nhập, hoặc tên + vai trò */
export default async function UserMenu() {
  const user = await getCurrentUser();
  // Chỉ 1 nút: popup đăng nhập đã có nút chuyển sang đăng ký
  if (!user) {
    return (
      <LoginLink href="/login" className="btn max-sm:px-3">
        Đăng nhập
      </LoginLink>
    );
  }
  return (
    <Link href="/settings" title="Cài đặt tài khoản" className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-white/5">
      {user.role === "admin" && <span className="pill bg-amber/15 text-amber max-sm:hidden">ADMIN</span>}
      <span className="max-w-40 truncate font-bold max-sm:max-w-28 max-[380px]:hidden">{user.name}</span>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber text-lg font-extrabold text-sidebar sm:size-10">
        {user.name.trim()[0]?.toUpperCase() ?? "?"}
      </div>
    </Link>
  );
}
