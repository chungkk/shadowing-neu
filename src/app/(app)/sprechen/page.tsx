import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";
import PageHeader from "@/components/PageHeader";

// Chưa ra mắt → không cho Google index trang chờ
export const metadata: Metadata = {
  title: "Sprechen — luyện nói tiếng Đức",
  description: "Sắp ra mắt: gọi thoại luyện nói với người học tiếng Đức khác cùng trình độ.",
  robots: { index: false, follow: true },
};

export default function SprechenPage() {
  return (
    <main className="page page-narrow" data-sec="de">
      <PageHeader
        sec="de"
        icon={Mic}
        compact
        title="Sprechen"
        meta={<span className="badge badge-gold">Sắp ra mắt</span>}
        sub="Tính năng luyện nói tiếng Đức với người thật đang được hoàn thiện. Trong lúc chờ, bạn có thể luyện nói theo video ngay bây giờ."
        actions={
          <Link href="/#lessons" className="btn btn-primary btn-lg max-sm:w-full">
            Luyện nói với Shadowing <ArrowRight className="size-5" />
          </Link>
        }
      />
    </main>
  );
}
