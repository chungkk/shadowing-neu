"use client"; // Error boundary phải là Client Component

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Mascot from "@/components/Mascot";

/** Lỗi không lường trước khi hiển thị trang → thông báo tiếng Việt + thử lại (không lộ chi tiết lỗi server) */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:py-16">
      <div data-sec="ink" className="relative">
        <div className="cover flex min-h-32 flex-col items-start gap-2 pt-5 pr-5 pb-14 pl-9 sm:pl-11">
          <TriangleAlert className="size-10" strokeWidth={2.25} aria-hidden />
          <span className="text-sm font-semibold opacity-80">Lỗi tải trang</span>
        </div>
        <div className="relative z-10 mx-3 -mt-10 sm:mx-6">
          <Mascot className="mascot-sad pointer-events-none absolute -top-[4.4rem] right-4 size-24 sm:right-6" />
          <div className="nhan flex flex-col gap-3 pb-5">
            <h1 className="page-title">Ối, trang này vừa bị lỗi</h1>
            <p className="leading-relaxed text-muted">
              Không phải do bạn đâu. Thử lại sau vài giây — nếu vẫn lỗi, hãy báo cho chúng tôi qua trang Hỗ trợ để được sửa sớm.
            </p>
            {digest && (
              <p className="nhan-line flex items-baseline gap-2 pb-1 text-sm text-muted">
                Mã lỗi: <code className="font-mono text-foreground">{digest}</code>
              </p>
            )}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <button className="btn btn-primary btn-lg" onClick={() => retry()}>
                <RotateCcw className="size-5" /> Thử lại
              </button>
              <Link href="/" className="btn btn-lg">
                Về trang chủ
              </Link>
              <Link href="/support" className="btn btn-lg btn-ghost">
                Báo lỗi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
