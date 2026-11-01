import { getCurrentUser } from "@/lib/auth";
import { LoginLink } from "./LoginDialog";
import Sidebar, { UserDropdown } from "./Sidebar";

/** Thanh dưới đáy (điện thoại) có thông tin người dùng (đọc cookie lúc request → đặt trong <Suspense>) */
export async function SidebarWithUser() {
  const user = await getCurrentUser();
  return <Sidebar user={user && { id: user.id, name: user.name, role: user.role, avatarAt: user.avatarAt }} />;
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
  return <UserDropdown user={{ id: user.id, name: user.name, role: user.role, avatarAt: user.avatarAt }} />;
}
