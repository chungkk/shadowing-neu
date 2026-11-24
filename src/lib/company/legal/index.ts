import { pageMetadata } from '@/lib/company/seo';
import { deutschRedewendung, workCalendar } from './local-apps';
import { shadowing } from './shadowing';
import type { LegalProduct } from './types';

/** Thêm sản phẩm mới: tạo nội dung, thêm vào đây, rồi tạo 2 route /<slug>/support và /<slug>/privacy. */
export const LEGAL_PRODUCTS: LegalProduct[] = [shadowing, deutschRedewendung, workCalendar];

export function legalProduct(slug: string): LegalProduct {
    const product = LEGAL_PRODUCTS.find((p) => p.slug === slug);
    if (!product) throw new Error(`Unknown legal product: ${slug}`);
    return product;
}

/**
 * Trang support/privacy chỉ để cửa hàng ứng dụng trỏ tới, không lên Google: sản phẩm chưa công khai và app riêng không thuộc HalloVN
 * (trang về app khác, phần lớn tiếng Đức, làm site trông thiếu nhất quán khi AdSense xét duyệt).
 */
export const NOINDEX_LEGAL_SLUGS = new Set(['calendar', 'deutsch-redewendung']);

export function supportMetadata(slug: string) {
    const product = legalProduct(slug);
    return pageMetadata({
        title: `Support – ${product.name}`,
        description: `Häufige Fragen, Hilfe und Kontakt zu ${product.name}. Antworten auf Deutsch, Englisch und Vietnamesisch.`,
        path: `/${slug}/support`,
        noindex: NOINDEX_LEGAL_SLUGS.has(slug),
    });
}

export function privacyMetadata(slug: string) {
    const product = legalProduct(slug);
    return pageMetadata({
        title: `Datenschutz – ${product.name}`,
        description: `Datenschutzerklärung für ${product.name}: welche Daten verarbeitet werden, wofür und welche Rechte Sie nach der DSGVO haben.`,
        path: `/${slug}/privacy`,
        noindex: NOINDEX_LEGAL_SLUGS.has(slug),
    });
}
