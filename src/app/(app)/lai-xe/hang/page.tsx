import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { CLASS_ORDER, DEFAULT_CLASS, classGroups, classQuestionIds, prefs } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, fmtNum, quizPageMeta } from "@/lib/laixe/seo";
import { ClassPicker } from "@/components/laixe/Settings";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = quizPageMeta({
  path: "/lai-xe/hang",
  title: "Chọn hạng bằng lái xe Đức – B, A, C, D, L, T",
  description: `Chọn hạng bằng lái xe Đức để luyện đúng bộ câu hỏi lý thuyết bằng tiếng Việt: ${CLASS_ORDER.join(", ")} — riêng hạng B có ${fmtNum(classQuestionIds(DEFAULT_CLASS).length)} câu.`,
});

async function Picker() {
  const { cls } = await prefs();
  return <ClassPicker groups={classGroups()} current={cls} />;
}

export default function Page() {
  return (
    <main className="page">
      <JsonLd data={breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"], ["Chọn hạng bằng", "/lai-xe/hang"]])} />
      <div className="flex items-center gap-2">
        <Link href="/lai-xe" className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="page-title">Chọn hạng bằng lái xe</h1>
      </div>
      <p className="text-muted">Mỗi hạng có bộ câu hỏi và luật thi riêng. Phần cơ bản (Grundstoff) dùng chung, phần riêng (Zusatzstoff) theo hạng.</p>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Picker />
      </Suspense>
    </main>
  );
}
