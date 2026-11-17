import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Settings, Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
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
      <nav aria-label="Liên kết tài khoản" className="card divide-y divide-line p-0">
        <Link href="/leaderboard" className="group flex min-h-14 items-center gap-3 px-4 py-3 font-semibold transition-colors hover:bg-card-2">
          <span className="icon-bubble tint-gold size-9" aria-hidden>
            <Trophy className="size-[18px]" />
          </span>
          Bảng xếp hạng
          <ChevronRight className="ml-auto size-5 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link href="/settings" className="group flex min-h-14 items-center gap-3 px-4 py-3 font-semibold transition-colors hover:bg-card-2">
          <span className="icon-bubble tint-muted size-9" aria-hidden>
            <Settings className="size-[18px]" />
          </span>
          Hồ sơ & cài đặt
          <ChevronRight className="ml-auto size-5 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </>
  );
}

export default function StatsPage() {
  return (
    <main className="page page-narrow">
      <PageHeader sec="ink" compact icon={Trophy} title="Thành tích" sub="Kim cương, chuỗi ngày ôn và những gì bạn đã học." />
      <Suspense fallback={<SettingsSkeleton />}>
        <Stats />
      </Suspense>
    </main>
  );
}
