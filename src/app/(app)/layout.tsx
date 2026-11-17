import { Suspense } from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { DeutschSubnav, HeaderNavFrame, SidebarSkeleton } from "@/components/Sidebar";
import LoginDialogSlot from "@/components/auth/LoginDialogSlot";
import Mascot from "@/components/Mascot";
import ShareBar from "@/components/ShareBar";
import SiteFooter from "@/components/SiteFooter";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu, { HeaderNavWithUser, SidebarWithUser } from "@/components/UserMenu";
import { siteJsonLd, serializeJsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Chữ thân: Be Vietnam Pro — do người Việt thiết kế, dấu tiếng Việt chuẩn và rõ ở cỡ nhỏ
const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

// Chữ tiêu đề: Bricolage Grotesque (biến thiên opsz) — tiêu đề lớn có cá tính, cỡ nhỏ vẫn gọn
const heading = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  axes: ["opsz"],
});


const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ADSENSE_CLIENT = "ca-pub-5590145594898560";

const SITE_TITLE = "HalloVN – Học tiếng Đức, thi lái xe & Leben in Deutschland cho người Việt";
const SITE_DESCRIPTION =
  "Học tiếng Đức qua video thật, ôn lý thuyết lái xe Đức và Leben in Deutschland có bản dịch tiếng Việt, chơi game luyện từ vựng. Miễn phí cho người Việt tại Đức.";

// Chỉ đặt phần chung cho cả nhóm trang. KHÔNG đặt alternates.canonical / openGraph.url / openGraph.title ở đây:
// trang con không tự khai báo sẽ thừa kế nguyên giá trị → mọi trang trỏ canonical / og:url về trang chủ.
// og:title / og:description / twitter tự lấy theo title + description của từng trang; ảnh chia sẻ mặc định
// là src/app/(app)/opengraph-image.tsx. Canonical "/" đặt ở page.tsx trang chủ.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s | HalloVN" },
  description: SITE_DESCRIPTION,
  applicationName: "HalloVN",
  authors: [{ name: "HalloVN", url: SITE_URL }],
  creator: "HalloVN",
  publisher: "HalloVN",
  keywords: [
    "HalloVN",
    "học tiếng Đức",
    "học tiếng Đức qua video",
    "tiếng Đức cho người Việt",
    "lý thuyết lái xe Đức",
    "thi bằng lái xe ở Đức",
    "Führerschein tiếng Việt",
    "Leben in Deutschland tiếng Việt",
    "Einbürgerungstest",
    "thi quốc tịch Đức",
    "từ vựng tiếng Đức",
    "Deutsch lernen",
  ],
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: { type: "website", siteName: "HalloVN", locale: "vi_VN", alternateLocale: ["de_DE"] },
  twitter: { card: "summary_large_image" },
  other: { "google-adsense-account": ADSENSE_CLIENT },
};

// viewport-fit=cover: thanh dưới đáy (điện thoại) kéo xuống sát mép, chừa chỗ thanh home bằng env(safe-area-inset-*)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfaf7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${body.variable} ${heading.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Áp giao diện đã chọn trước khi trình duyệt vẽ trang, tránh nháy nền sáng */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Tải sẵn linh vật của màn tải trang: mạng chậm mới hiện màn này, lúc đó không kịp tải hình nữa */}
        <link rel="prefetch" href="/mascot-loading.svg" as="image" />
        {/* JSON-LD Organization + WebSite của HalloVN (một lần cho mọi trang) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteJsonLd()) }} />
      </head>
      <body className="flex min-h-full">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarWithUser />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {/* z-30: menu thả xuống ở avatar nổi trên nội dung trang */}
          <header className="site-header relative z-30 border-b border-line bg-card dark:bg-sidebar">
            <div className="flex h-14 items-center gap-3 px-3 sm:h-16 sm:gap-5 sm:px-4 md:px-6">
              <Link href="/" aria-label="HalloVN — trang chủ" className="group flex min-w-0 shrink-0 items-center gap-2 rounded-xl pr-1">
                <Mascot className="size-9 shrink-0 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-rotate-8 group-hover:scale-110 motion-reduce:transition-none sm:size-10" />
                <span className="flex items-baseline font-display text-[1.3rem] leading-none font-extrabold tracking-[-0.03em] sm:text-[1.45rem]">
                  Hallo
                  <span className="ml-0.5 -rotate-3 rounded-[5px] bg-gold px-1 py-0.5 text-[0.8em] text-[#16203a] transition-transform duration-300 ease-[var(--ease-spring)] group-hover:rotate-3">VN</span>
                </span>
              </Link>
              <Suspense fallback={<HeaderNavFrame />}>
                <HeaderNavWithUser />
              </Suspense>
              <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
                <ThemeToggle />
                <Suspense>
                  <UserMenu />
                </Suspense>
              </div>
            </div>
          </header>
          {/* share-gutter: chừa lề phải khi thanh chia sẻ đang mở (globals.css) */}
          <div className="share-gutter flex min-w-0 flex-1 flex-col">
            <Suspense>
              <DeutschSubnav />
            </Suspense>
            {children}
          </div>
          <SiteFooter />
        </div>
        <Suspense>
          <ShareBar />
        </Suspense>
        {/* Google AdSense: tải lúc trình duyệt rảnh (không chặn trang, không chèn vào <head> trước khi hydrate → hết lệch HTML);
            xác minh site dùng thẻ meta google-adsense-account trong metadata */}
        <Script
          strategy="lazyOnload"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
        {/* Popup đăng nhập / đăng ký: bấm nút đăng nhập ở trang nào cũng hiện đè lên trang đó */}
        <Suspense>
          <LoginDialogSlot />
        </Suspense>
      </body>
    </html>
  );
}
