import type { Metadata } from "next";
import Link from "next/link";
import { Be_Vietnam_Pro, Bricolage_Grotesque } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./(app)/globals.css";

// 404 cho đường dẫn không khớp route nào. Root layout nằm trong route group (app) nên not-found.tsx ở gốc app/ không có layout để bọc → dùng global-not-found.
// Không có layout → tự nạp font như src/app/(app)/layout.tsx (cùng tên biến CSS).
const body = Be_Vietnam_Pro({ variable: "--font-body", subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700", "800"] });
const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin", "vietnamese"], axes: ["opsz"] });

export const metadata: Metadata = { title: "Không tìm thấy trang | HalloVN", robots: { index: false, follow: true } };

export default function GlobalNotFound() {
  return (
    <html lang="vi" className={`${body.variable} ${heading.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center border-b border-line bg-card px-4 sm:h-16 sm:px-6 dark:bg-sidebar">
          <Link href="/" aria-label="HalloVN — trang chủ" className="flex items-center gap-2 rounded-xl pr-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot.svg" alt="" className="size-9 sm:size-10" />
            <span className="flex items-baseline font-display text-[1.3rem] leading-none font-extrabold tracking-[-0.03em] sm:text-[1.45rem]">
              Hallo
              <span className="ml-0.5 -rotate-3 rounded-[5px] bg-gold px-1 py-0.5 text-[0.8em] text-[#16203a]">VN</span>
            </span>
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:py-16">
          <div data-sec="ink" className="relative">
            <div className="cover flex min-h-36 flex-col items-start gap-1.5 pt-5 pr-5 pb-16 pl-9 sm:pl-11">
              <span className="font-display text-6xl leading-none font-extrabold tracking-[-0.05em] tabular-nums sm:text-7xl">404</span>
              <span className="text-sm font-semibold opacity-80">Seite nicht gefunden · Page not found</span>
            </div>
            <div className="relative z-10 mx-3 -mt-11 sm:mx-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mascot.svg" alt="" className="bob pointer-events-none absolute -top-[4.6rem] right-4 size-24 sm:right-6" />
              <div className="nhan flex flex-col gap-3 pb-5">
                <h1 className="page-title">Trang này không có trong vở</h1>
                <p className="leading-relaxed text-muted">Đường dẫn không đúng hoặc trang đã được dời đi. Về trang chủ để học tiếp nhé.</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Link href="/" className="btn btn-primary btn-lg">
                    Về trang chủ
                  </Link>
                  <Link href="/about" className="btn btn-lg">
                    Über HalloVN
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
