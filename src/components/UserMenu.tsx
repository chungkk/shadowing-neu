import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { dueCount, getPoints } from "@/lib/db";
import PointsBadge from "./PointsBadge";
import ReminderBell from "./ReminderBell";
import { LoginLink } from "./auth/LoginDialog";
import Sidebar, { DeutschOnly, HeaderNav, ReviewPill, UserDropdown } from "./Sidebar";

/** Thanh dưới đáy (điện thoại) có thông tin người dùng */
export async function SidebarWithUser() {
  const user = await getCurrentUser();
  return <Sidebar user={user && { id: user.id, name: user.name, role: user.role, avatarAt: user.avatarAt }} due={user ? dueCount(user.id) : 0} />;
}

/** Lối tắt thanh trên cùng (máy tính) */
export async function HeaderNavWithUser() {
  await getCurrentUser();
  return <HeaderNav />;
}

/** Góc phải thanh trên cùng */
export default async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <LoginLink href="/login" className="btn btn-ghost btn-sm text-foreground">
          Đăng nhập
        </LoginLink>
        <Link href="/tieng-duc" className="btn btn-primary btn-sm max-sm:hidden">
          Bắt đầu học
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      <DeutschOnly>
        <ReviewPill due={dueCount(user.id)} />
        <PointsBadge initial={getPoints(user.id).total} />
      </DeutschOnly>
      <ReminderBell userId={user.id} />
      <UserDropdown user={{ id: user.id, name: user.name, role: user.role, avatarAt: user.avatarAt }} />
    </div>
  );
}
