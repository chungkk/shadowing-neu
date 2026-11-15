import type { Metadata } from 'next';
import { SITE } from '@/lib/company/site';
import { SERVICES, productPath } from '@/lib/company/services';
import type { ServiceId } from '@/lib/company/services';
import { PRODUCT_PAGES } from '@/lib/company/productPages';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/company/seo';
import { ORGANIZATION_ID } from '@/lib/seo';

const serviceOf = (id: ServiceId) => SERVICES.find((s) => s.id === id)!;

/** @id của nền tảng học trong JSON-LD (trang /about tham chiếu tới cùng @id) */
export const productJsonLdId = (id: ServiceId) => `${SITE.url}${productPath(serviceOf(id))}#app`;

/**
 * Trang có file opengraph-image.tsx riêng: trong route group Next gắn thêm mã vào URL ảnh
 * (/shadowing/opengraph-image-<mã>) nên không ghi URL tay được. Bỏ trường images để Next tự chèn ảnh của file.
 */
export function withFileOgImage(meta: Metadata): Metadata {
    const openGraph: NonNullable<Metadata['openGraph']> = { ...meta.openGraph };
    const twitter: NonNullable<Metadata['twitter']> = { ...meta.twitter };
    delete openGraph.images;
    delete twitter.images;
    return { ...meta, openGraph, twitter };
}

export function productMetadata(id: ServiceId): Metadata {
    const { seo } = PRODUCT_PAGES[id];
    const path = productPath(serviceOf(id));
    return withFileOgImage(pageMetadata({ title: seo.title, description: seo.description, path, absolute: true }));
}

/** Nút WebApplication của nền tảng học, dùng chung cho /shadowing và /about */
export function productAppNode(id: ServiceId) {
    const service = serviceOf(id);
    const page = PRODUCT_PAGES[id];
    return {
        '@type': 'WebApplication',
        '@id': productJsonLdId(id),
        name: service.name,
        description: page.seo.description,
        url: `${SITE.url}${productPath(service)}`,
        // Nơi học thật (trang chủ hallovn.de)
        installUrl: new URL(service.href, SITE.url).href,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires a modern web browser',
        screenshot: page.screens.map((s) => `${SITE.url}${s.src}`),
        // Miễn phí, không có mua trong app. Google cần offers để hiện rich result ứng dụng.
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
        // Giao diện tiếng Việt, nội dung học tiếng Đức
        inLanguage: ['vi', 'de'],
        audience: { '@type': 'Audience', audienceType: 'Vietnamese speakers living in Germany' },
        publisher: { '@id': ORGANIZATION_ID },
    };
}

export function productJsonLd(id: ServiceId) {
    const service = serviceOf(id);
    const page = PRODUCT_PAGES[id];
    const url = `${SITE.url}${productPath(service)}`;
    return {
        '@context': 'https://schema.org',
        '@graph': [
            productAppNode(id),
            {
                '@type': 'FAQPage',
                '@id': `${url}#faq`,
                inLanguage: 'de',
                mainEntity: page.copy.de.faq.map((item) => ({
                    '@type': 'Question',
                    name: item.q,
                    acceptedAnswer: { '@type': 'Answer', text: item.a },
                })),
            },
            breadcrumbJsonLd([
                { name: 'Über HalloVN', path: '/about' },
                { name: 'Lernplattform', path: productPath(service) },
            ]),
        ],
    };
}
