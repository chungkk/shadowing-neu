import { Suspense } from "react";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { Baloo_2, Geist_Mono, Nunito, Paytone_One } from "next/font/google";
import { HeaderNav, HeaderNavFrame, SidebarSkeleton } from "@/components/Sidebar";
import LoginDialogSlot from "@/components/LoginDialogSlot";
import Mascot from "@/components/Mascot";
import ShareBar from "@/components/ShareBar";
import SiteFooter from "@/components/SiteFooter";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu, { SidebarWithUser } from "@/components/UserMenu";
import { SITE_URL } from "@/lib/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Awning } from "@/components/CandyPieces";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "vietnamese"],
});

/* Chữ tiêu đề của giao diện Kẹo; không tải sẵn vì chỉ dùng khi chọn giao diện đó */
const paytone = Paytone_One({ weight: "400", subsets: ["latin", "vietnamese"], variable: "--font-candy", preload: false });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Deutsch Shadowing", template: "%s · Deutsch Shadowing" },
  description: "Luyện shadowing tiếng Đức với video YouTube",
  openGraph: { siteName: "Deutsch Shadowing", locale: "vi_VN" },
};

// viewport-fit=cover: thanh dưới đáy (điện thoại) kéo xuống sát mép, chừa chỗ thanh home bằng env(safe-area-inset-*)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#241a1c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" data-theme="dark" className={`${nunito.variable} ${baloo.variable} ${geistMono.variable} ${paytone.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Áp giao diện đã chọn trước khi trình duyệt vẽ trang, tránh nháy nền sáng */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Tải sẵn linh vật của màn tải trang: mạng chậm mới hiện màn này, lúc đó không kịp tải hình nữa */}
        <link rel="prefetch" href="/mascot-loading.svg" as="image" />
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5590145594898560"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-full">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarWithUser />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {/* z-30: menu thả xuống ở avatar nổi trên nội dung trang */}
          <header className="relative z-30 flex h-14 items-center gap-3 bg-card dark:bg-sidebar px-3 pb-2 sm:h-16 sm:gap-4 sm:px-4 md:px-6">
            <div className="candy-stripe absolute inset-x-0 bottom-0 h-2.5" />
            <Link href="/" className="flex items-center gap-1.5 font-display text-xl font-extrabold">
              <Mascot className="size-11 max-md:hidden" />
              <span>
                <span className="hidden sm:inline">Deutsch </span>Shadowing
              </span>
            </Link>
            <Suspense fallback={<HeaderNavFrame />}>
              <HeaderNav />
            </Suspense>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Suspense>
                <UserMenu />
              </Suspense>
            </div>
          </header>
          <Awning className="candy-only relative z-20 -mt-px" />
          {/* share-gutter: chừa lề phải khi thanh chia sẻ đang mở (globals.css) */}
          <div className="share-gutter flex min-w-0 flex-1 flex-col">{children}</div>
          <SiteFooter />
        </div>
        <Suspense>
          <ShareBar />
        </Suspense>
        {/* Popup đăng nhập / đăng ký: bấm nút đăng nhập ở trang nào cũng hiện đè lên trang đó */}
        <Suspense>
          <LoginDialogSlot />
        </Suspense>
      </body>
    </html>
  );
}
