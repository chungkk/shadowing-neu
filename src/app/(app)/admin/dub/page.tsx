import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import AdminPageHeader from "../_components/AdminPageHeader";
import DubClient from "./DubClient";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata = {
  title: "Thuyết minh YouTube — HalloVN Admin",
};

async function DubPageInner() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Nội dung học tập" }, { label: "Thuyết minh YouTube" }]}
        title="Thuyết minh YouTube"
        description="Dán link YouTube, chọn giọng, bấm 1 nút — tự dịch tiếng Việt, đọc MP3 rồi phát song song với video."
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
