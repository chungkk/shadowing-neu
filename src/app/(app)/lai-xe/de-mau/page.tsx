import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { ChristmasFileStackIcon as FileStack } from "@/components/FestiveIcons";
import { SubHeader } from "@/components/quiz/QuizParts";
import { getCurrentUser } from "@/lib/auth";
import { bogenProgress } from "@/lib/db";
import { BOGEN_COUNT, WEB_BOGEN_LIMIT } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, quizPageMeta } from "@/lib/laixe/seo";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = quizPageMeta({
  path: "/lai-xe/de-mau",
  title: "Đề mẫu thi lý thuyết lái xe hạng B (Musterbögen)",
  description: `${BOGEN_COUNT} đề mẫu chính thức (Musterbögen) thi lý thuyết lái xe Đức hạng B, mỗi đề 30 câu, dịch tiếng Việt: làm thử ${WEB_BOGEN_LIMIT} đề trên web.`,
});

async function Sheets() {
  const user = await getCurrentUser();
  const progress = user ? bogenProgress(user.id, "fuehrerschein") : {};
  const passed = Object.entries(progress).filter(([n, p]) => Number(n) <= WEB_BOGEN_LIMIT && p.everPassed).length;
  return (
    <>
      {user ? (
        <div className="card flex flex-col gap-2">
          <p className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-muted">Đã đậu</span>
            <span className="stat-value text-xl">
              {passed}/{WEB_BOGEN_LIMIT} đề
            </span>
          </p>
          <div className="progress" aria-hidden>
            <div className="progress-bar bg-ok" style={{ width: `${(passed / WEB_BOGEN_LIMIT) * 100}%` }} />
          </div>
          <p className="field-hint">Ba vạch dưới mỗi đề là 3 lần thi gần nhất (xanh lá = đậu, đỏ = trượt)</p>
        </div>
      ) : (
        <p className="alert alert-info">
          <span>
            <Link href="/login?next=/lai-xe/de-mau" className="font-bold underline underline-offset-2">
              Đăng nhập
            </Link>{" "}
            để lưu kết quả từng đề.
          </span>
        </p>
      )}
      <ul className="grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: Math.min(WEB_BOGEN_LIMIT, BOGEN_COUNT) }, (_, i) => i + 1).map((n) => {
          const p = progress[n];
          return (
            <li key={n} className={`tile flex flex-col gap-3 ${p?.everPassed ? "border-ok/40" : ""}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-xl font-extrabold tracking-[-0.02em]">Đề {n}</span>
                {p?.everPassed && (
                  <span className="badge badge-ok" aria-label="Đã đậu">
                    <Check className="size-3.5" aria-hidden /> Đậu
                  </span>
                )}
              </span>
              <span className="flex h-2 gap-1" aria-label={p ? `${p.last.length} lần thi gần nhất` : "Chưa làm"}>
                {[0, 1, 2].map((k) => (
                  <span key={k} className={`h-2 flex-1 rounded-full ${p?.last[k] === undefined ? "bg-line" : p.last[k] ? "bg-ok" : "bg-red"}`} />
                ))}
              </span>
              <span className="flex gap-1.5">
                <Link prefetch={false} rel="nofollow" href={`/lai-xe/de-mau/${n}?mode=lesen`} className="btn btn-sm flex-1">
                  Đọc
                </Link>
                <Link prefetch={false} rel="nofollow" href={`/lai-xe/de-mau/${n}?mode=ueben`} className="btn btn-sm flex-1">
                  Luyện
                </Link>
                <Link prefetch={false} rel="nofollow" href={`/lai-xe/de-mau/${n}`} className="btn btn-sm btn-primary flex-1">
                  Thi
                </Link>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function Page() {
  return (
    <main className="page" data-sec="laixe">
      <JsonLd data={breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"], ["Đề mẫu hạng B", "/lai-xe/de-mau"]])} />
      <SubHeader sec="laixe" back="/lai-xe/thi-thu" backLabel="Thi thử" icon={FileStack} title="Đề mẫu chính thức" sub="Musterbögen hạng B · mỗi đề 20 câu cơ bản + 10 câu hạng B. Đọc, luyện hoặc thi có giờ." />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Sheets />
      </Suspense>
    </main>
  );
}
