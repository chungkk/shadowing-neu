import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { lockSettings } from "@/lib/access";
import { adminSidebarCounts } from "@/lib/db";
import AdminSidebar, { AdminSidebarSkeleton } from "./_components/AdminSidebar";

export const metadata: Metadata = {
  title: "Quản trị — HalloVN",
  robots: { index: false, follow: false },
};

async function AdminSidebarData() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return null;
  const counts = adminSidebarCounts();
  const lock = lockSettings();
  return <AdminSidebar counts={{ ...counts, lockEnabled: lock.enabled }} />;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-sec="ink" className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col lg:flex-row">
      <Suspense fallback={<AdminSidebarSkeleton />}>
        <AdminSidebarData />
      </Suspense>
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-5 md:px-6 md:py-7 lg:px-8">
        {children}
      </main>
    </div>
  );
}
