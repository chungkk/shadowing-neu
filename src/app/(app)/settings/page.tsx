import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { ChristmasSettingsIcon as SettingsIcon } from "@/components/FestiveIcons";
import PageHeader from "@/components/PageHeader";
import { envAdminEmail, requireUser } from "@/lib/auth";
import { getPoints } from "@/lib/db";
import SettingsForms, { Row } from "@/components/SettingsForms";
import { SettingsSkeleton } from "@/components/Skeleton";
import { DrivingSettings } from "@/components/laixe/Settings";
import { classGroups, prefs } from "@/lib/laixe";

export const metadata: Metadata = {
  title: "Hồ sơ & cài đặt",
  robots: { index: false, follow: false },
};

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
      points={getPoints(user.id).total}
      learning={
        <>
          <DrivingSettings groups={classGroups()} current={cls} />
          <Row
            icon={Landmark}
            title="Leben in Deutschland"
            desc="Chọn tiểu bang (Bundesland), tự đánh dấu câu sai và quản lý tiến độ LiD."
            wide
            action={
              <Link href="/leben-in-deutschland/cai-dat" className="btn btn-sm">
                Cài đặt LiD →
              </Link>
            }
          />
        </>
      }
    />
  );
}

export default function SettingsPage() {
  return (
    <main className="page max-w-5xl">
      <PageHeader sec="ink" compact icon={SettingsIcon} title="Hồ sơ & cài đặt" sub="Hồ sơ, việc học, bảo mật tài khoản và dữ liệu của bạn." />
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </main>
  );
}
