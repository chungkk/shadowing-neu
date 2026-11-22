import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import AdminPageHeader from "../_components/AdminPageHeader";
import DubClient from "./DubClient";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata = {
  title: "Thuyết minh YouTube (Admin) — HalloVN",
};

async function DubPageInner() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Nội dung học tập" }, { label: "Thuyết minh YouTube" }]}
        title="Thuyết minh YouTube (VieNeu-TTS)"
        description="Dán link YouTube bất kỳ → tự lấy hoặc dịch phụ đề sang tiếng Việt → đọc bằng giọng Lạc Phi / VieNeu-TTS và ghép thành file MP4 tải về. Chỉ Admin mới thấy và dùng được."
      />
      <DubClient />
    </>
  );
}

export default function DubPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <DubPageInner />
    </Suspense>
  );
}
