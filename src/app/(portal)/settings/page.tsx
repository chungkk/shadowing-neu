import { Suspense } from "react";
import { envAdminEmail, requireUser } from "@/lib/auth";
import { accountStats } from "@/lib/account-stats";
import AccountStats from "@/components/AccountStats";
import SettingsForms from "@/components/SettingsForms";
import { SettingsSkeleton } from "@/components/Skeleton";
import { DrivingSettings } from "@/components/lai-xe/Settings";
import { classGroups, prefs } from "@/lib/fuehrerschein";

async function Settings() {
  const user = await requireUser("/settings");
  const { cls, lang } = await prefs();
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
      learning={<DrivingSettings groups={classGroups()} current={cls} lang={lang} />}
    />
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Hồ sơ & cài đặt</h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </main>
  );
}
