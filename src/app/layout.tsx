import { Suspense } from "react";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { Baloo_2, Geist_Mono, Nunito } from "next/font/google";
import { HeaderNav, HeaderNavFrame, SidebarSkeleton } from "@/components/Sidebar";
import LoginDialogSlot from "@/components/LoginDialogSlot";
import Mascot from "@/components/Mascot";
import ShareBar from "@/components/ShareBar";
import SiteFooter from "@/components/SiteFooter";
import UserMenu, { SidebarWithUser } from "@/components/UserMenu";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "vietnamese"],
});

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
  themeColor: "#fff6e9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${nunito.variable} ${baloo.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarWithUser />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {/* z-30: menu thả xuống ở avatar nổi trên nội dung trang */}
          <header className="relative z-30 flex h-14 items-center gap-3 bg-card px-3 pb-2 sm:h-16 sm:gap-4 sm:px-4 md:px-6">
            <div className="candy-stripe absolute inset-x-0 bottom-0 h-2.5" />
            <Link href="/" className="group flex items-center gap-1 font-display text-xl font-extrabold sm:gap-1.5">
              <Mascot className="size-10 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:-rotate-6 motion-reduce:transform-none sm:size-12" />
              <span>
                <span className="hidden sm:inline md:max-lg:hidden">Deutsch </span>
                <span className="text-red-400">Shadowing</span>
              </span>
            </Link>
            <Suspense fallback={<HeaderNavFrame />}>
              <HeaderNav />
            </Suspense>
            <div className="ml-auto">
              <Suspense>
                <UserMenu />
              </Suspense>
            </div>
          </header>
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
