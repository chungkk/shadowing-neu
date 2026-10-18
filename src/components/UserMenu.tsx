import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "./Sidebar";

/** Thanh bên có thông tin người dùng (đọc cookie lúc request → đặt trong <Suspense>) */
export async function SidebarWithUser() {
  const user = await getCurrentUser();
  return <Sidebar user={user && { name: user.name, role: user.role }} />;
}

/** Góc phải thanh trên cùng: nút đăng nhập/đăng ký, hoặc tên + vai trò */
export default async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn">
          Đăng nhập
        </Link>
        <Link href="/register" className="btn btn-primary py-2">
          Đăng ký
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      {user.role === "admin" && <span className="pill bg-amber/15 text-amber">ADMIN</span>}
      <span className="max-w-40 truncate font-bold">{user.name}</span>
      <div className="flex size-10 items-center justify-center rounded-full bg-amber text-lg font-extrabold text-sidebar">
        {user.name.trim()[0]?.toUpperCase() ?? "?"}
      </div>
    </div>
  );
}
