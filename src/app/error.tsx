"use client";

import { useEffect } from "react";
import Link from "next/link";
import Mascot from "@/components/Mascot";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="bubble bubble-down bubble-pop bg-gold px-4 py-1.5 font-display text-xl font-extrabold">Oje!</p>
      <Mascot className="size-44 sm:size-56" />
      <h1 className="text-3xl font-extrabold md:text-4xl">Trang này chưa tải được</h1>
      <p className="max-w-md text-muted">Thử tải lại nhé. Nếu vẫn lỗi, bạn về trang chủ rồi mở lại sau một lúc.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary px-6 py-3" onClick={() => retry()}>
          Thử lại
        </button>
        <Link href="/" className="btn px-6 py-3">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
