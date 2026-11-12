import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listFeedback, type FeedbackKind } from "@/lib/db";
import { removeFeedback } from "../actions";
import DeleteButton from "../DeleteButton";
import { ListSkeleton } from "@/components/Skeleton";

const KIND: Record<FeedbackKind, { label: string; className: string }> = {
  idea: { label: "Góp ý", className: "text-accent-text" },
  bug: { label: "Báo lỗi", className: "text-red-400" },
  content: { label: "Nội dung", className: "text-amber" },
  other: { label: "Khác", className: "text-muted" },
};

/** Góp ý / báo lỗi người dùng gửi từ app (mới nhất trước) */
async function FeedbackList() {
  await requireAdmin();
  const items = listFeedback();
  return (
    <>
      <h1 className="text-2xl font-extrabold">Góp ý ({items.length})</h1>
      <div className="card divide-y divide-border p-0">
        {items.map((f) => (
          <div key={f.id} className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className={`font-bold ${KIND[f.kind]?.className ?? ""}`}>{KIND[f.kind]?.label ?? f.kind}</span>
              <span>{f.userName ?? (f.userId ? "—" : "Khách")}</span>
              {f.email && (
                <a href={`mailto:${f.email}`} className="text-link hover:underline">
                  {f.email}
                </a>
              )}
              <span>{f.createdAt.slice(0, 16)} UTC</span>
              <span className="ml-auto">
                <DeleteButton action={removeFeedback.bind(null, f.id)} confirmText="Xoá góp ý này?" />
              </span>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed">{f.message}</p>
            {f.device && <p className="text-xs text-muted">{f.device}</p>}
          </div>
        ))}
        {!items.length && <p className="p-6 text-center text-sm text-muted">Chưa có góp ý nào.</p>}
      </div>
    </>
  );
}

export default function FeedbackPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Link href="/admin" className="text-sm text-muted hover:underline">
        ← Quản trị
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <FeedbackList />
      </Suspense>
    </main>
  );
}
