import type { Metadata } from "next";
import Mascot from "@/components/Mascot";

export const metadata: Metadata = {
  title: "Sprechen — luyện nói tiếng Đức",
  description: "Sắp ra mắt: gọi thoại luyện nói với người học tiếng Đức khác cùng trình độ.",
};

export default function SprechenPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-6 text-center">
        <p className="bubble bubble-down bubble-pop bg-gold px-4 py-1.5 font-display text-xl font-extrabold">Bis bald!</p>
        <Mascot animated className="size-44 sm:size-56" />
        <h1 className="text-3xl font-extrabold md:text-4xl">Sắp ra mắt</h1>
        <p className="text-muted">Tính năng luyện nói tiếng Đức với người thật đang được hoàn thiện. Bạn quay lại sau nhé!</p>
      </div>
    </main>
  );
}
