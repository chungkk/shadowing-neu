"use client"; // Error boundary phải là Client Component

import { useEffect } from "react";
import Link from "next/link";

/** Lỗi không lường trước khi hiển thị trang → thông báo tiếng Việt + thử lại (không lộ chi tiết lỗi server) */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 p-4 pt-20 text-center">
      <h1 className="text-2xl font-extrabold">Có lỗi xảy ra</h1>
      <p className="text-sm text-muted">
        Trang này tạm thời không hiển thị được. Thử lại sau giây lát — nếu vẫn lỗi, hãy gửi góp ý cho chúng tôi
        {digest && <> (mã lỗi: <code>{digest}</code>)</>}.
      </p>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={() => retry()}>
          Thử lại
        </button>
        <Link href="/" className="btn">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
