// JSON-LD (schema.org) dùng chung cho toàn site HalloVN. Organization + WebSite có @id cố định để
// các trang khác (sản phẩm, bài học, breadcrumb…) tham chiếu bằng { "@id": ORGANIZATION_ID }.
import { COMPANY, FACEBOOK_PAGE_URL, SITE } from "@/lib/company/site";
import { SITE_URL } from "@/lib/site";

export const BRAND_NAME = "HalloVN";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const LOGO_URL = `${SITE_URL}/apple-icon.png`;

type JsonLd = Record<string, unknown>;

/** Organization HalloVN (đơn vị phát hành mọi app / trang học) */
export function organizationJsonLd(): JsonLd {
  const [postalCode, ...city] = COMPANY.postalCity.split(" ");
  const sameAs = [FACEBOOK_PAGE_URL].filter(Boolean);
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: BRAND_NAME,
    legalName: COMPANY.legalName,
    url: SITE_URL,
    email: SITE.contactEmail,
    logo: { "@type": "ImageObject", url: LOGO_URL, width: 180, height: 180 },
    address: { "@type": "PostalAddress", postalCode, addressLocality: city.join(" "), addressCountry: "DE" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE.supportEmail,
      url: `${SITE_URL}/support`,
      availableLanguage: ["vi", "de", "en"],
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** WebSite HalloVN. inLanguage mặc định cả tiếng Việt (trang học) lẫn tiếng Đức (trang doanh nghiệp). */
export function websiteJsonLd({
  description = "Học tiếng Đức qua video, ôn thi lý thuyết lái xe và Leben in Deutschland bằng tiếng Việt.",
  inLanguage = ["vi", "de"],
}: { description?: string; inLanguage?: string | string[] } = {}): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: BRAND_NAME,
    description,
    inLanguage,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/** Gói nhiều node vào một @graph (thêm @context) */
export function jsonLdGraph(...nodes: JsonLd[]): JsonLd {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** Organization + WebSite — chèn một lần ở root layout */
export function siteJsonLd(website?: Parameters<typeof websiteJsonLd>[0]): JsonLd {
  return jsonLdGraph(organizationJsonLd(), websiteJsonLd(website));
}

/** Chuỗi JSON an toàn để nhét vào <script type="application/ld+json"> (chặn "</script>" trong dữ liệu) */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
