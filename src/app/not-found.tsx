import type { Metadata } from "next";
import Link from "next/link";
import Mascot from "@/components/Mascot";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="bubble bubble-down bubble-pop bg-gold px-4 py-1.5 font-display text-xl font-extrabold">Hoppla!</p>
      <Mascot animated className="size-44 sm:size-56" />
      <h1 className="text-3xl font-extrabold md:text-4xl">Không tìm thấy trang này</h1>
      <p className="max-w-md text-muted">Link có thể đã cũ hoặc gõ nhầm. Về trang chủ để chọn bài khác nhé.</p>
      <Link href="/" className="btn btn-primary mt-2 px-6 py-3">
        Về trang chủ
      </Link>
    </main>
  );
}
