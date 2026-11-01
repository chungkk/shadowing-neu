import { Suspense } from "react";
import type { Metadata } from "next";
import { Mic } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginLink } from "@/components/LoginDialog";
import Sprechen from "@/components/Sprechen";

export const metadata: Metadata = {
  title: "Sprechen — luyện nói tiếng Đức",
  description: "Gọi thoại miễn phí với người học tiếng Đức khác cùng trình độ (A1–C2): ghép ngẫu nhiên 1-1 hoặc tạo phòng tối đa 5 người.",
};

async function Lobby() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-[0_4px_0_var(--accent-dark)]">
          <Mic className="size-8" />
        </span>
        <p className="font-bold">Đăng nhập để vào phòng luyện nói với người học khác.</p>
        <LoginLink href="/login?next=/sprechen" className="btn btn-primary">
          Đăng nhập
        </LoginLink>
      </div>
    );
  }
  return <Sprechen me={{ id: user.id, name: user.name }} />;
}

export default function SprechenPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-extrabold md:text-3xl">Sprechen — luyện nói tiếng Đức với người thật</h1>
        <p className="max-w-xl text-sm text-muted">
          Gọi thoại miễn phí với người học cùng trình độ: ghép ngẫu nhiên 1-1, hoặc tạo phòng tối đa 5 người để cùng luyện nói, luyện thi Goethe / telc.
        </p>
      </header>
      <Suspense fallback={<div className="skeleton mx-auto h-96 w-full max-w-6xl rounded-2xl" />}>
        <Lobby />
      </Suspense>
    </main>
  );
}
