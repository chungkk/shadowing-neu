import type { Metadata } from "next";
import { LocaleProvider } from "@/components/company/LocaleContext";
import InfoSubnav from "@/components/company/InfoSubnav";
import { SITE } from "@/lib/company/site";
import { OG_LOCALE } from "@/lib/company/seo";

// Các trang thông tin chung của hallovn.de (giới thiệu, hỗ trợ, pháp lý, trang sản phẩm) — tiếng Đức mặc định, đổi được sang EN/VI.
// Layout lồng trong khung app (src/app/(app)/layout.tsx): header, thanh bên, SiteFooter, giao diện sáng/tối và
// JSON-LD Organization + WebSite đều lấy từ root layout, ở đây chỉ thêm bộ chọn ngôn ngữ và metadata tiếng Đức.
// Trang con tự khai báo openGraph đầy đủ (src/lib/company/seo.ts → pageMetadata) vì Next chỉ gộp metadata nông.

const SITE_TITLE = "HalloVN – Lernplattform für Vietnamesen in Deutschland";

export const metadata: Metadata = {
  title: { default: SITE_TITLE, template: "%s | HalloVN" },
  description: SITE.description,
  keywords: ["HalloVN", "Deutsch lernen", "Führerschein Theorie", "Leben in Deutschland", "Vietnamesen in Deutschland", "Softwareentwicklung", "App-Entwicklung"],
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.fullName,
    title: SITE_TITLE,
    description: SITE.description,
    ...OG_LOCALE,
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE.description },
};

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <InfoSubnav />
      {/* info-page: phạm vi CSS của các trang thông tin ((app)/globals.css, mục "Trang thông tin") */}
      <main className="info-page flex-1">{children}</main>
    </LocaleProvider>
  );
}
