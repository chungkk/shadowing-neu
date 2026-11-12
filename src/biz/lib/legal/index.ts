import { pageMetadata } from '@/biz/lib/seo';
import { fuehrerschein } from './fuehrerschein';
import { lid } from './lid';
import { deutschRedewendung, workCalendar } from './local-apps';
import { shadowing } from './shadowing';
import type { LegalProduct } from './types';

/** Thêm sản phẩm mới: tạo nội dung, thêm vào đây, rồi tạo 2 route /<slug>/support và /<slug>/privacy. */
export const LEGAL_PRODUCTS: LegalProduct[] = [fuehrerschein, lid, shadowing, deutschRedewendung, workCalendar];

export function legalProduct(slug: string): LegalProduct {
    const product = LEGAL_PRODUCTS.find((p) => p.slug === slug);
    if (!product) throw new Error(`Unknown legal product: ${slug}`);
    return product;
}

/** Sản phẩm chưa công khai: vẫn có trang support/privacy cho cửa hàng ứng dụng nhưng không lên Google. */
export const NOINDEX_LEGAL_SLUGS = new Set(['calendar']);

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
