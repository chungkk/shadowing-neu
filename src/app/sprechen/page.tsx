import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Mic } from "lucide-react";

// Chưa ra mắt → không cho Google index trang chờ
export const metadata: Metadata = {
  title: "Sprechen — luyện nói tiếng Đức",
  description: "Sắp ra mắt: gọi thoại luyện nói với người học tiếng Đức khác cùng trình độ.",
  robots: { index: false, follow: true },
};

export default function SprechenPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div className="card mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-[0_4px_0_var(--accent-dark)]">
          <Mic className="size-8" />
        </span>
        <h1 className="text-2xl font-extrabold md:text-3xl">Sắp ra mắt</h1>
        <p className="text-sm text-muted">Tính năng luyện nói tiếng Đức với người thật đang được hoàn thiện. Trong lúc chờ, bạn có thể luyện nói theo video ngay bây giờ.</p>
        <Link href="/#lessons" className="btn btn-primary w-full py-3">
          Luyện nói với Shadowing <ChevronRight className="size-5" />
        </Link>
      </div>
    </main>
  );
}
