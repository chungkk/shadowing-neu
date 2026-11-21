"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Mascot from "@/components/Mascot";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-14 text-center">
      <div className="card flex w-full flex-col items-center gap-4 p-6 sm:p-8">
        <Mascot className="mascot-sad size-20" />
        <span className="badge badge-red">
          <TriangleAlert className="size-3.5" aria-hidden /> Lỗi tải trang
        </span>
        <h1 className="page-title text-2xl">Trang này vừa gặp sự cố</h1>
        <p className="max-w-md text-sm leading-relaxed text-muted">
          Không phải do bạn đâu. Hãy thử tải lại sau vài giây — nếu vẫn gặp lỗi, bạn có thể báo cho chúng tôi qua trang Hỗ trợ.
        </p>
        {digest && (
          <p className="text-xs text-muted">
            Mã lỗi: <code className="rounded bg-card-2 px-1.5 py-0.5 font-mono text-foreground">{digest}</code>
          </p>
        )}
        <div className="mt-1 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
          <button className="btn btn-primary" onClick={() => retry()}>
            <RotateCcw className="size-4" /> Thử lại
          </button>
          <Link href="/" className="btn">
            Về trang chủ
          </Link>
          <Link href="/support" className="btn btn-ghost">
            Báo lỗi
          </Link>
        </div>
      </div>
    </main>
  );
}
