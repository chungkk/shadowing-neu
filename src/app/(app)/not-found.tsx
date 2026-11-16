import Link from "next/link";
import Mascot from "@/components/Mascot";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center p-4 py-16">
      <div className="card hero rise-in flex w-full flex-col items-center gap-4 p-6 text-center sm:p-8">
      <Mascot className="bob size-24" />
      <span className="badge badge-gold">404</span>
      <h1 className="page-title">Không tìm thấy trang</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">Bài học hoặc trang bạn mở không tồn tại, hoặc đã được đổi đường dẫn.</p>
      <Link href="/" className="btn btn-primary btn-lg mt-1">
        Về trang chủ
      </Link>
      </div>
    </main>
  );
}
