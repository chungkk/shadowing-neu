import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  ChristmasCarIcon as Car,
  ChristmasDeutschIcon as Languages,
  ChristmasLidIcon as Landmark,
  ChristmasReviewIcon as Layers,
  ChristmasSettingsIcon as Settings,
  ChristmasTrophyIcon as Trophy,
} from "@/components/FestiveIcons";
import PageHeader from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { accountStats } from "@/lib/account-stats";
import AccountStats from "@/components/AccountStats";
import { SettingsSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thành tích", robots: { index: false } };

async function Stats() {
  const user = await requireUser("/stats");
  const stats = accountStats(user.id);
  return (
    <>
      {/* Ưu tiên hành động tiếp theo thay vì chỉ trưng bày số liệu */}
      <section className="card flex flex-col gap-3 p-4 sm:p-5" aria-label="Tiếp tục học">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label">Tiếp tục học</p>
          {stats.due > 0 && (
            <Link href="/vocab/notebook?review=1" className="btn btn-primary btn-sm">
              <Layers className="size-3.5" /> Ôn {stats.due} từ đến hạn ngay
            </Link>
          )}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Link href="/tieng-duc" data-sec="de" className="group tile card-link flex items-center gap-3 p-3">
            <span className="icon-bubble tint-sec size-9">
              <Languages className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Tiếng Đức</span>
              <span className="block text-xs text-muted">{stats.lessons} bài đã học</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/lai-xe" data-sec="laixe" className="group tile card-link flex items-center gap-3 p-3">
            <span className="icon-bubble tint-sec size-9">
              <Car className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Lái xe Đức</span>
              <span className="block text-xs text-muted">Ôn câu sai &amp; thi thử</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/leben-in-deutschland" data-sec="lid" className="group tile card-link flex items-center gap-3 p-3">
            <span className="icon-bubble tint-sec size-9">
              <Landmark className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Leben in DE</span>
              <span className="block text-xs text-muted">300 câu + câu bang</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <AccountStats stats={stats} />

      <nav aria-label="Liên kết tài khoản" className="card divide-y divide-line overflow-hidden p-0">
        <Link href="/leaderboard" className="group flex min-h-14 items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-card-2">
          <span className="icon-bubble tint-gold size-9" aria-hidden>
            <Trophy className="size-[18px]" />
          </span>
          Bảng xếp hạng
          <ChevronRight className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link href="/settings" className="group flex min-h-14 items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-card-2">
          <span className="icon-bubble tint-muted size-9" aria-hidden>
            <Settings className="size-[18px]" />
          </span>
          Hồ sơ &amp; cài đặt
          <ChevronRight className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </>
  );
}

export default function StatsPage() {
  return (
    <main className="page page-narrow">
      <PageHeader sec="ink" compact icon={Trophy} title="Tiến độ & thành tích" sub="Tổng quan kim cương, chuỗi ngày ôn và lối tắt vào việc học tiếp theo." />
      <Suspense fallback={<SettingsSkeleton />}>
        <Stats />
      </Suspense>
    </main>
  );
}
