import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/biz/contexts/LocaleContext";
import Header from "@/biz/components/Header";
import Footer from "@/biz/components/Footer";
import { SITE } from "@/biz/lib/site";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "vietnamese"],
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const SITE_TITLE = "CKK – Software, Apps und Web-Anwendungen";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE_TITLE,
    template: "%s | CKK",
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  keywords: ["Softwareentwicklung", "App-Entwicklung", "Web-Anwendungen", "Führerschein Theorie", "Leben in Deutschland", "Deutsch Shadowing", "CKK"],
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.fullName,
    title: SITE_TITLE,
    description: SITE.description,
    locale: "de_DE",
    alternateLocale: ["en_US", "vi_VN"],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE.description },
};

export const viewport: Viewport = {
  themeColor: "#e3e6e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5590145594898560"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${bricolage.variable} ${beVietnam.variable} antialiased`}>
        <LocaleProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pt-16">
              {children}
            </main>
            <Footer />
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
