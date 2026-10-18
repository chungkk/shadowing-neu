import { Suspense } from "react";
import { envAdminEmail, requireUser } from "@/lib/auth";
import SettingsForms from "@/components/SettingsForms";

async function Settings() {
  const user = await requireUser("/settings");
  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold">Cài đặt tài khoản</h1>
        <p className="text-sm text-muted">
          {user.role === "admin" ? "Admin" : "Học viên"} · tham gia từ {user.createdAt.slice(0, 10)}
        </p>
      </div>
      <SettingsForms name={user.name} email={user.email} fixedAdmin={user.email === envAdminEmail()} />
    </>
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}
