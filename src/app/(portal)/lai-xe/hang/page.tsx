import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { classGroups, prefs } from "@/lib/fuehrerschein";
import { ClassPicker } from "@/components/lai-xe/Settings";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Chọn hạng bằng · Lý thuyết lái xe", description: "Chọn hạng bằng lái xe Đức để luyện đúng bộ câu hỏi: B, A, A1, A2, AM, Mofa, C, CE, C1, D, D1, L, T." };

async function Picker() {
  const { cls } = await prefs();
  return <ClassPicker groups={classGroups()} current={cls} />;
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link href="/lai-xe" className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold">Chọn hạng bằng</h1>
      </div>
      <p className="text-muted">Mỗi hạng có bộ câu hỏi và luật thi riêng. Phần cơ bản (Grundstoff) dùng chung, phần riêng (Zusatzstoff) theo hạng.</p>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Picker />
      </Suspense>
    </main>
  );
}
