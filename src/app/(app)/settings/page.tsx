import { Suspense } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { envAdminEmail, requireUser } from "@/lib/auth";
import { accountStats } from "@/lib/account-stats";
import AccountStats from "@/components/AccountStats";
import SettingsForms from "@/components/SettingsForms";
import { SettingsSkeleton } from "@/components/Skeleton";
import { DrivingSettings } from "@/components/laixe/Settings";
import { classGroups, prefs } from "@/lib/laixe";

async function Settings() {
  const user = await requireUser("/settings");
  const { cls } = await prefs();
  return (
    <SettingsForms
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        admin: user.role === "admin",
        createdAt: user.createdAt,
        avatarAt: user.avatarAt,
        hasPassword: user.hasPassword,
      }}
      fixedAdmin={user.email === envAdminEmail()}
      stats={<AccountStats stats={accountStats(user.id)} />}
      learning={<DrivingSettings groups={classGroups()} current={cls} />}
    />
  );
}

export default function SettingsPage() {
  return (
    <main className="page page-narrow">
      <PageHeader sec="ink" compact icon={SettingsIcon} title="Hồ sơ & cài đặt" sub="Tên, ảnh đại diện, mật khẩu, hạng bằng lái và dữ liệu của bạn." />
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </main>
  );
}
