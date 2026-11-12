import type { Metadata } from "next";
import Link from "next/link";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./(portal)/globals.css";

// 404 cho đường dẫn không thuộc trang nào (app có 2 root layout: (portal) và (biz) nên không dùng được not-found.tsx chung)
export const metadata: Metadata = { title: "Không tìm thấy trang · CKK", robots: { index: false, follow: true } };

export default function GlobalNotFound() {
  return (
    <html lang="vi" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen items-center justify-center p-4">
        <main className="sticker flex max-w-md flex-col items-center gap-4 p-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" className="size-24" />
          <h1 className="text-2xl font-extrabold">Không tìm thấy trang</h1>
          <p className="text-sm text-muted">Seite nicht gefunden · Page not found</p>
          <div className="flex flex-wrap justify-center gap-2">
                        <Link href="/" className="btn btn-primary">
              Về trang học
            </Link>
            <Link href="/about" className="btn">
              Über CKK
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
