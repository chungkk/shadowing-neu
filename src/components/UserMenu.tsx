import { getCurrentUser } from "@/lib/auth";
import { dueCount, getPoints } from "@/lib/db";
import PointsBadge from "./PointsBadge";
import { LoginLink } from "./LoginDialog";
import Sidebar, { DeutschOnly, HeaderNav, ReviewPill, UserDropdown } from "./Sidebar";

/** Thanh dưới đáy (điện thoại) có thông tin người dùng (đọc cookie lúc request → đặt trong <Suspense>) */
export async function SidebarWithUser() {
  const user = await getCurrentUser();
  return <Sidebar user={user && { id: user.id, name: user.name, role: user.role, avatarAt: user.avatarAt }} due={user ? dueCount(user.id) : 0} />;
}

/** Lối tắt thanh trên cùng (máy tính) */
export async function HeaderNavWithUser() {
  await getCurrentUser(); // đọc cookie lúc request (giữ trong <Suspense> như trước)
  return <HeaderNav />;
}

/** Góc phải thanh trên cùng: nút đăng nhập, hoặc điểm chính tả + tên + vai trò */
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
    <div className="flex items-center gap-2 sm:gap-3">
      <DeutschOnly>
        <ReviewPill due={dueCount(user.id)} />
        <PointsBadge initial={getPoints(user.id).total} />
      </DeutschOnly>
      <UserDropdown user={{ id: user.id, name: user.name, role: user.role, avatarAt: user.avatarAt }} />
    </div>
  );
}
