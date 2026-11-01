import { Suspense } from "react";
import { envAdminEmail, requireUser } from "@/lib/auth";
import { getStats, listProgress } from "@/lib/db";
import AccountStats from "@/components/AccountStats";
import SettingsForms from "@/components/SettingsForms";
import { SettingsSkeleton } from "@/components/Skeleton";

async function Settings() {
  const user = await requireUser("/settings");
  // Múi giờ chỉ ảnh hưởng "hôm nay" / chuỗi ngày — AccountStats tự tải lại theo giờ máy
  const s = getStats(user.id, 0);
  const progress = listProgress(user.id);
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
      stats={
        <AccountStats
          stats={{
            points: s.points.total,
            words: Object.values(s.mastery).reduce((a, b) => a + b, 0),
            mastered: s.mastery.mastered,
            due: s.dueToday,
            lessons: progress.length,
            sentences: progress.reduce((n, p) => n + Object.keys(p.dictDone).length, 0),
          }}
        />
      }
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
