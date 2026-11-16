import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ChevronRight, Mic } from "lucide-react";

// Chưa ra mắt → không cho Google index trang chờ
export const metadata: Metadata = {
  title: "Sprechen — luyện nói tiếng Đức",
  description: "Sắp ra mắt: gọi thoại luyện nói với người học tiếng Đức khác cùng trình độ.",
  robots: { index: false, follow: true },
};

export default function SprechenPage() {
  return (
    <main className="page">
      <div className="card hero rise-in mx-auto mt-4 flex w-full max-w-md flex-col items-center gap-4 p-8 text-center sm:mt-10" style={{ "--hero": "var(--candy)" } as CSSProperties}>
        <span className="icon-bubble size-20 rounded-full tint-candy">
          <Mic className="size-9" />
        </span>
        <span className="badge badge-gold">Sprechen</span>
        <h1 className="page-title">Sắp ra mắt</h1>
        <p className="lead text-base">Tính năng luyện nói tiếng Đức với người thật đang được hoàn thiện. Trong lúc chờ, bạn có thể luyện nói theo video ngay bây giờ.</p>
        <Link href="/#lessons" className="btn btn-primary btn-lg w-full">
          Luyện nói với Shadowing <ChevronRight className="size-5" />
        </Link>
      </div>
    </main>
  );
}
