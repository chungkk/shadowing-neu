import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 p-4 pt-20 text-center">
      <h1 className="page-title">Không tìm thấy trang</h1>
      <p className="text-sm text-muted">Bài học hoặc trang bạn mở không tồn tại, hoặc đã được đổi đường dẫn.</p>
      <Link href="/" className="btn btn-primary">
        Về trang chủ
      </Link>
    </main>
  );
}
