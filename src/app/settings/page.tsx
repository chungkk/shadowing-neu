import { Suspense } from "react";
import { envAdminEmail, requireUser } from "@/lib/auth";
import SettingsForms from "@/components/SettingsForms";
import { SettingsSkeleton } from "@/components/Skeleton";

async function Settings() {
  const user = await requireUser("/settings");
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
    />
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Cài đặt tài khoản</h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </main>
  );
}
