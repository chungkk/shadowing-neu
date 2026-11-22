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
        description="Dán link YouTube → tự lấy & dịch phụ đề sang tiếng Việt → tạo file MP3 giọng Lạc Phi rồi phát song song đồng bộ với video YouTube (hoặc xuất MP4 tải về). Chỉ Admin mới dùng được."
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
