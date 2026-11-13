import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { bogenProgress } from "@/lib/db";
import { BOGEN_COUNT } from "@/lib/fuehrerschein";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Đề mẫu chính thức hạng B · Lý thuyết lái xe",
  description: `${BOGEN_COUNT} đề mẫu chính thức (Musterbögen) thi lý thuyết lái xe Đức hạng B, mỗi đề 30 câu: đọc, luyện hoặc thi như thật.`,
};

async function Sheets() {
  const user = await getCurrentUser();
  const progress = user ? bogenProgress(user.id, "fuehrerschein") : {};
  const passed = Object.values(progress).filter((p) => p.everPassed).length;
  return (
    <>
      {user ? (
        <p className="font-bold">
          Đã đậu {passed}/{BOGEN_COUNT} đề · mỗi chấm là 1 lần thi gần nhất (xanh = đậu, đỏ = trượt)
        </p>
      ) : (
        <p className="text-sm text-muted">Đăng nhập để lưu kết quả từng đề.</p>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: BOGEN_COUNT }, (_, i) => i + 1).map((n) => {
          const p = progress[n];
          return (
            <li key={n} className={`sticker flex flex-col gap-2 p-3 ${p?.everPassed ? "bg-accent/10" : ""}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-extrabold">Đề {n}</span>
                {p?.everPassed && <span className="text-accent-text" aria-label="Đã đậu">✓</span>}
              </span>
              <span className="flex h-2 gap-1" aria-label={p ? `${p.last.length} lần thi gần nhất` : "Chưa làm"}>
                {[0, 1, 2].map((k) => (
                  <span key={k} className={`h-2 flex-1 rounded-full ${p?.last[k] === undefined ? "bg-foreground/10" : p.last[k] ? "bg-accent" : "bg-red"}`} />
                ))}
              </span>
              <span className="flex gap-1 text-xs">
                <Link href={`/lai-xe/de-mau/${n}?mode=lesen`} className="flex-1 rounded-lg border-2 border-ink/30 py-1 text-center font-bold hover:border-ink">
                  Đọc
                </Link>
                <Link href={`/lai-xe/de-mau/${n}?mode=ueben`} className="flex-1 rounded-lg border-2 border-ink/30 py-1 text-center font-bold hover:border-ink">
                  Luyện
                </Link>
                <Link href={`/lai-xe/de-mau/${n}`} className="flex-1 rounded-lg border-2 border-ink bg-red py-1 text-center font-extrabold text-white">
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link href="/lai-xe" className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold">Đề mẫu chính thức (Musterbögen)</h1>
          <p className="text-sm text-muted">Hạng B · mỗi đề 20 câu cơ bản + 10 câu hạng B</p>
        </div>
      </div>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Sheets />
      </Suspense>
    </main>
  );
}
