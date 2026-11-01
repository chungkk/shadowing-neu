import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import { SidebarSkeleton } from "@/components/Sidebar";
import LoginDialogSlot from "@/components/LoginDialogSlot";
import UserMenu, { SidebarWithUser } from "@/components/UserMenu";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deutsch Shadowing",
  description: "Luyện shadowing tiếng Đức với video YouTube",
};

// viewport-fit=cover: thanh dưới đáy (điện thoại) kéo xuống sát mép, chừa chỗ thanh home bằng env(safe-area-inset-*)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c110e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarWithUser />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <header className="relative flex h-14 items-center gap-3 px-3 sm:h-16 sm:gap-4 sm:px-4 md:px-6">
            <div className="flag-stripe absolute inset-x-0 bottom-0 h-1 shadow-[0_-1px_0_var(--border)]" />
            <span className="text-lg font-extrabold lg:hidden">
              <span className="hidden sm:inline">Deutsch </span>Shadowing
            </span>
            <div className="ml-auto">
              <Suspense>
                <UserMenu />
              </Suspense>
            </div>
          </header>
          {children}
        </div>
        {/* Popup đăng nhập / đăng ký: bấm nút đăng nhập ở trang nào cũng hiện đè lên trang đó */}
        <Suspense>
          <LoginDialogSlot />
        </Suspense>
      </body>
    </html>
  );
}
