import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { FORCE_DARK, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./(app)/globals.css";

const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = { title: "Không tìm thấy trang | HalloVN", robots: { index: false, follow: true } };

export default function GlobalNotFound() {
  return (
    <html lang="vi" data-theme={FORCE_DARK ? "dark" : undefined} className={`${body.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-line bg-card dark:bg-sidebar">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:h-15 md:px-6">
            <Link href="/" aria-label="HalloVN — trang chủ" className="flex items-center gap-2 rounded-lg pr-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mascot.svg" alt="" className="size-8" />
              <span className="flex items-center gap-1 font-display text-[1.15rem] leading-none font-extrabold tracking-[-0.03em]">
                Hallo
                <span className="rounded bg-accent px-1.5 py-0.5 text-[0.68em] font-bold tracking-normal text-white">VN</span>
              </span>
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot.svg" alt="" className="mb-5 size-20 opacity-90" />
          <p className="font-mono text-xs font-semibold tracking-widest text-muted uppercase">404 · Seite nicht gefunden</p>
          <h1 className="page-title mt-2">Không tìm thấy trang này</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">Đường dẫn có thể đã đổi hoặc trang đã được dời đi. Quay lại trang chủ để tiếp tục học.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link href="/" className="btn btn-primary">
              Về trang chủ
            </Link>
            <Link href="/about" className="btn">
              Über HalloVN
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
