import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Mail, MessageSquare, RotateCcw } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { FEEDBACK_KINDS, listFeedback, type FeedbackKind, type FeedbackStatus } from "@/lib/db";
import { removeFeedback, toggleFeedbackStatus } from "../actions";
import DeleteButton from "../DeleteButton";
import AdminPageHeader from "../_components/AdminPageHeader";
import KpiCard from "../_components/KpiCard";
import { ListSkeleton } from "@/components/Skeleton";

const KIND: Record<FeedbackKind, { label: string; className: string }> = {
  bug: { label: "Báo lỗi", className: "badge-red" },
  idea: { label: "Góp ý", className: "badge-link" },
  content: { label: "Nội dung", className: "badge-gold" },
  other: { label: "Khác", className: "badge-muted" },
};

type StatusFilter = "open" | "resolved" | "all";
type KindFilter = "all" | FeedbackKind;

async function FeedbackList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status: StatusFilter = sp.status === "resolved" || sp.status === "all" ? sp.status : "open";
  const kind: KindFilter =
    typeof sp.kind === "string" && (FEEDBACK_KINDS as readonly string[]).includes(sp.kind) ? (sp.kind as FeedbackKind) : "all";

  const items = listFeedback(300);
  const openCount = items.filter((f) => f.status === "open").length;
  const resolvedCount = items.length - openCount;
  const openBugs = items.filter((f) => f.status === "open" && f.kind === "bug").length;
  const openIdeas = items.filter((f) => f.status === "open" && f.kind === "idea").length;

  const shown = items.filter((f) => {
    if (status !== "all" && f.status !== status) return false;
    if (kind !== "all" && f.kind !== kind) return false;
    return true;
  });

  const href = (over: { status?: StatusFilter; kind?: KindFilter }) => {
    const p = new URLSearchParams();
    const s = over.status ?? status;
    const k = over.kind ?? kind;
    if (s !== "open") p.set("status", s);
    if (k !== "all") p.set("kind", k);
    const qs = p.toString();
    return qs ? `/admin/feedback?${qs}` : "/admin/feedback";
  };

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Người dùng & Cộng đồng" }, { label: "Góp ý & Báo lỗi" }]}
        title="Góp ý & Báo lỗi"
        count={items.length}
        description="Theo dõi báo lỗi kỹ thuật, góp ý tính năng và phản hồi nội dung từ web và ứng dụng iOS."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard tone={openCount > 0 ? "red" : "ok"} label="Chưa xử lý" value={openCount} sub="Cần phản hồi / rà soát" />
        <KpiCard tone="red" label="Báo lỗi mở" value={openBugs} sub="Ưu tiên kiểm tra sớm" />
        <KpiCard tone="ink" label="Góp ý mở" value={openIdeas} sub="Đề xuất cải tiến" />
        <KpiCard tone="ok" label="Đã xử lý" value={resolvedCount} sub={`Tổng ${items.length} mục`} />
      </div>

      {/* Bộ lọc trạng thái + phân loại */}
      <div className="card flex flex-col gap-2.5 p-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <nav aria-label="Lọc trạng thái" className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "open", label: "Chưa xử lý", n: openCount },
              { id: "resolved", label: "Đã xử lý", n: resolvedCount },
              { id: "all", label: "Tất cả", n: items.length },
            ] as const
          ).map((s) => (
            <Link key={s.id} href={href({ status: s.id })} aria-current={status === s.id ? "page" : undefined} className="chip text-xs">
              {s.label}
              <span className="font-mono tabular-nums opacity-70">{s.n}</span>
            </Link>
          ))}
        </nav>

        <nav aria-label="Lọc phân loại" className="flex flex-wrap gap-1.5">
          <Link href={href({ kind: "all" })} aria-current={kind === "all" ? "true" : undefined} className="chip text-xs">
            Mọi loại
          </Link>
          {(["bug", "idea", "content", "other"] as FeedbackKind[]).map((k) => (
            <Link key={k} href={href({ kind: k })} aria-current={kind === k ? "true" : undefined} className="chip text-xs">
              {KIND[k].label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="card overflow-hidden p-0">
        {shown.length ? (
          <ul className="divide-y divide-line">
            {shown.map((f) => {
              const nextStatus: FeedbackStatus = f.status === "open" ? "resolved" : "open";
              const mailSubject = encodeURIComponent(`[HalloVN] Phản hồi góp ý #${f.id}`);
              return (
                <li key={f.id} className={`flex flex-col gap-2.5 p-4 transition-colors hover:bg-card-2/40 ${f.status === "resolved" ? "opacity-75" : ""}`}>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted">
                    <span className={`badge ${KIND[f.kind]?.className ?? "badge-muted"}`}>{KIND[f.kind]?.label ?? f.kind}</span>
                    {f.status === "resolved" ? (
                      <span className="badge badge-ok">Đã xử lý</span>
                    ) : (
                      <span className="badge badge-coral">Chưa xử lý</span>
                    )}
                    {f.userId ? (
                      <Link href={`/admin/users/${f.userId}`} className="font-semibold text-foreground hover:text-sec-text hover:underline">
                        {f.userName ?? `User #${f.userId}`}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">Khách</span>
                    )}
                    {f.email && (
                      <a href={`mailto:${f.email}?subject=${mailSubject}`} className="inline-flex items-center gap-1 font-semibold text-link hover:underline">
                        <Mail className="size-3.5" aria-hidden /> {f.email}
                      </a>
                    )}
                    <span className="font-mono tabular-nums">#{f.id} · {f.createdAt.slice(0, 16)} UTC</span>
                  </div>

                  <p className="max-w-[75ch] text-[0.95rem] leading-relaxed whitespace-pre-line text-foreground">{f.message}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {f.device && <span className="font-mono text-xs text-muted">{f.device}</span>}
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                      <form action={toggleFeedbackStatus.bind(null, f.id, nextStatus)}>
                        <button className={`btn btn-sm ${f.status === "open" ? "btn-soft" : "btn-ghost"}`}>
                          {f.status === "open" ? (
                            <>
                              <CheckCircle2 className="size-3.5" aria-hidden /> Đánh dấu xong
                            </>
                          ) : (
                            <>
                              <RotateCcw className="size-3.5" aria-hidden /> Mở lại
                            </>
                          )}
                        </button>
                      </form>
                      <DeleteButton action={removeFeedback.bind(null, f.id)} confirmText="Xoá góp ý này?" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty">
            <span className="icon-bubble tint-muted">
              <MessageSquare className="size-5" aria-hidden />
            </span>
            <p>{items.length ? "Không có góp ý nào trong mục lọc này." : "Chưa có góp ý nào."}</p>
            {items.length > 0 && status !== "all" && (
              <Link href={href({ status: "all", kind: "all" })} className="btn btn-sm">
                Xem tất cả ({items.length})
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function FeedbackPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <FeedbackList searchParams={searchParams} />
    </Suspense>
  );
}
