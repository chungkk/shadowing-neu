import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { listFeedback, type FeedbackKind } from "@/lib/db";
import { removeFeedback } from "../actions";
import DeleteButton from "../DeleteButton";
import { ListSkeleton } from "@/components/Skeleton";
import { MessageSquare } from "lucide-react";
import AdminNav from "../AdminNav";

const KIND: Record<FeedbackKind, { label: string; className: string }> = {
  idea: { label: "Góp ý", className: "badge-accent" },
  bug: { label: "Báo lỗi", className: "badge-red" },
  content: { label: "Nội dung", className: "badge-gold" },
  other: { label: "Khác", className: "badge-muted" },
};

/** Góp ý / báo lỗi người dùng gửi từ app (mới nhất trước) */
async function FeedbackList() {
  await requireAdmin();
  const items = listFeedback();
  return (
    <>
      <h1 className="page-title">Góp ý ({items.length})</h1>
      <div className="card overflow-hidden p-0">
        <ul className="divide-y divide-line">
        {items.map((f) => (
          <li key={f.id} className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
              <span className={`badge ${KIND[f.kind]?.className ?? "badge-muted"}`}>{KIND[f.kind]?.label ?? f.kind}</span>
              <span>{f.userName ?? (f.userId ? "—" : "Khách")}</span>
              {f.email && (
                <a href={`mailto:${f.email}`} className="font-semibold text-link hover:underline">
                  {f.email}
                </a>
              )}
              <span className="tabular-nums">{f.createdAt.slice(0, 16)} UTC</span>
              <span className="ml-auto">
                <DeleteButton action={removeFeedback.bind(null, f.id)} confirmText="Xoá góp ý này?" />
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{f.message}</p>
            {f.device && <p className="text-xs text-muted">{f.device}</p>}
          </li>
        ))}
        </ul>
        {!items.length && (
          <div className="empty">
            <span className="icon-bubble tint-accent">
              <MessageSquare className="size-5" aria-hidden />
            </span>
            <p>Chưa có góp ý nào.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function FeedbackPage() {
  return (
    <main className="page page-narrow">
      <AdminNav />
      <Suspense fallback={<ListSkeleton />}>
        <FeedbackList />
      </Suspense>
    </main>
  );
}
