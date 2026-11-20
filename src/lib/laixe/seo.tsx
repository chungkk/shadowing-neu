import type { Metadata } from "next";
import { serializeJsonLd } from "../seo";
import { SITE_URL } from "../site";

// SEO dùng chung cho tab Lái xe và Leben in Deutschland: metadata trang + JSON-LD (BreadcrumbList, Quiz, FAQPage).
// openGraph của trang con THAY HẲN openGraph của layout gốc (gộp nông) → phải đặt lại siteName / locale ở đây.

const SITE_NAME = "HalloVN";

/** Số kiểu Đức / Việt: 1746 → "1.746" */
export const fmtNum = (n: number) => n.toLocaleString("de-DE");

/** Metadata trang công khai: title (layout gốc tự thêm tên thương hiệu), description, canonical, Open Graph, Twitter */
export function quizPageMeta({ path, title, description, robots }: { path: string; title: string; description: string; robots?: Metadata["robots"] }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "vi_VN", url: path, title, description },
    twitter: { card: "summary_large_image", title, description },
    ...(robots ? { robots } : {}),
  };
}

/** [tên, đường dẫn] từ trang chủ xuống trang hiện tại (không cần thêm "Trang chủ") */
export type Crumb = [name: string, path: string];

export const breadcrumbLd = (crumbs: Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [["Trang chủ", ""] as Crumb, ...crumbs].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE_URL + path })),
});

/** Bộ câu luyện tập (chỉ mô tả bộ câu — không đưa nội dung câu / đáp án vào JSON-LD, xem lib/crawl-guard.ts) */
export const quizLd = ({ path, name, description, about }: { path: string; name: string; description: string; about: string }) => ({
  "@context": "https://schema.org",
  "@type": "Quiz",
  name,
  description,
  url: SITE_URL + path,
  inLanguage: ["de", "vi"],
  educationalUse: "practice",
  learningResourceType: "Practice problem",
  about: { "@type": "Thing", name: about },
  isAccessibleForFree: true,
  provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
});

export const faqLd = (faq: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

/** <script type="application/ld+json"> an toàn (chặn "</script>" trong chuỗi) */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
