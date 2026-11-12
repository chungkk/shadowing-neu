import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Settings, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { accountStats } from "@/lib/account-stats";
import AccountStats from "@/components/AccountStats";
import { SettingsSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thành tích", robots: { index: false } };

async function Stats() {
  const user = await requireUser("/stats");
  return (
    <>
      <AccountStats stats={accountStats(user.id)} />
      {/* Điện thoại: Xếp hạng và Cài đặt không có ở thanh dưới đáy khi đã đăng nhập → lối vào ở đây */}
      <nav aria-label="Liên kết tài khoản" className="grid gap-3 sm:grid-cols-2">
        <Link href="/leaderboard" className="sticker sticker-link flex items-center gap-3 p-4 font-extrabold">
          <Trophy className="size-5 text-amber" /> Bảng xếp hạng <ChevronRight className="ml-auto size-5 text-muted" />
        </Link>
        <Link href="/settings" className="sticker sticker-link flex items-center gap-3 p-4 font-extrabold">
          <Settings className="size-5 text-muted" /> Hồ sơ & cài đặt <ChevronRight className="ml-auto size-5 text-muted" />
        </Link>
      </nav>
    </>
  );
}

export default function StatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Thành tích</h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <Stats />
      </Suspense>
    </main>
  );
}
