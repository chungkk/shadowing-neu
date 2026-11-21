import { Suspense } from "react";
import Link from "next/link";
import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { DeutschSubnav, HeaderNavFrame, SidebarSkeleton } from "@/components/Sidebar";
import LoginDialogSlot from "@/components/auth/LoginDialogSlot";
import Mascot from "@/components/Mascot";
import ShareBar from "@/components/ShareBar";
import SiteFooter from "@/components/SiteFooter";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu, { HeaderNavWithUser, SidebarWithUser } from "@/components/UserMenu";
import { siteJsonLd, serializeJsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { SEASONAL_THEME, THEME_COLOR, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Plus Jakarta Sans: tối giản, sắc nét, hỗ trợ đầy đủ dấu tiếng Việt và ký tự Đức (ä, ö, ü, ß)
const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ADSENSE_CLIENT = "ca-pub-5590145594898560";

const SITE_TITLE = "HalloVN – Học tiếng Đức, thi lái xe & Leben in Deutschland cho người Việt";
const SITE_DESCRIPTION =
  "Học tiếng Đức qua video thật, ôn lý thuyết lái xe Đức và Leben in Deutschland có bản dịch tiếng Việt. Miễn phí cho người Việt tại Đức.";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR.light,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      data-season={SEASONAL_THEME ?? undefined}
      className={`${body.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="prefetch" href="/mascot-loading.svg" as="image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteJsonLd()) }} />
      </head>
      <body className="flex min-h-full">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarWithUser />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <header className="site-header sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-md dark:bg-sidebar/90">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:h-15 sm:gap-6 md:px-6">
              <Link href="/" aria-label="HalloVN — trang chủ" className="group flex min-w-0 shrink-0 items-center gap-2 rounded-lg pr-1">
                <Mascot className="size-8 shrink-0 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none" />
                <span className="flex items-center gap-1 font-display text-[1.15rem] leading-none font-extrabold tracking-[-0.03em] sm:text-[1.22rem]">
                  Hallo
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[0.68em] font-bold tracking-normal text-white">VN</span>
                </span>
              </Link>
              <Suspense fallback={<HeaderNavFrame />}>
                <HeaderNavWithUser />
              </Suspense>
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
                <ThemeToggle />
                <Suspense>
                  <UserMenu />
                </Suspense>
              </div>
            </div>
          </header>
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
        <Script
          strategy="lazyOnload"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
        <Suspense>
          <LoginDialogSlot />
        </Suspense>
      </body>
    </html>
  );
}
