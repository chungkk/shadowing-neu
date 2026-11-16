"use client"; // Error boundary phải là Client Component

import { useEffect } from "react";
import Link from "next/link";
import Mascot from "@/components/Mascot";

/** Lỗi không lường trước khi hiển thị trang → thông báo tiếng Việt + thử lại (không lộ chi tiết lỗi server) */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center p-4 py-16">
      <div className="card rise-in flex w-full flex-col items-center gap-4 p-6 text-center sm:p-8">
      <span className="icon-bubble tint-red size-24 rounded-full">
        <Mascot className="mascot-sad size-20" />
      </span>
      <span className="badge badge-red">Lỗi</span>
      <h1 className="page-title">Có lỗi xảy ra</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Trang này tạm thời không hiển thị được. Thử lại sau giây lát — nếu vẫn lỗi, hãy gửi góp ý cho chúng tôi
        {digest && <> (mã lỗi: <code>{digest}</code>)</>}.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <button className="btn btn-primary" onClick={() => retry()}>
          Thử lại
        </button>
        <Link href="/" className="btn">
          Về trang chủ
        </Link>
      </div>
      </div>
    </main>
  );
}
