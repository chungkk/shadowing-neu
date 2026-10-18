import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import { SidebarSkeleton } from "@/components/Sidebar";
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
  description: "Luyện shadowing tiếng Đức từ YouTube hoặc file trên máy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarWithUser />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
          <header className="relative flex h-16 items-center gap-4 px-4 md:px-6">
            <div className="flag-stripe absolute inset-x-0 bottom-0 h-1 shadow-[0_-1px_0_var(--border)]" />
            <span className="text-lg font-extrabold">
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
      </body>
    </html>
  );
}
