import type { Metadata } from 'next';
import { COMPANY, SITE } from '@/biz/lib/site';
import { SERVICES, productPath } from '@/biz/lib/services';
import type { ServiceId } from '@/biz/lib/services';
import { PRODUCT_PAGES } from '@/biz/lib/productPages';
import { breadcrumbJsonLd, pageMetadata } from '@/biz/lib/seo';

const serviceOf = (id: ServiceId) => SERVICES.find((s) => s.id === id)!;

export function productMetadata(id: ServiceId): Metadata {
    const { seo, screens, shape } = PRODUCT_PAGES[id];
    const path = productPath(serviceOf(id));
    // App iOS dùng ảnh OG sinh sẵn (src/app/<slug>/opengraph-image.tsx); trang web dùng ảnh chụp ngang.
    const images =
        shape === 'landscape'
            ? [{ url: screens[0].src, width: screens[0].width, height: screens[0].height, alt: seo.title }]
            : [{ url: `${path}/opengraph-image`, width: 1200, height: 630, alt: seo.title }];
    return pageMetadata({ title: seo.title, description: seo.description, path, absolute: true, images });
}

export function productJsonLd(id: ServiceId) {
    const service = serviceOf(id);
    const page = PRODUCT_PAGES[id];
    const mobile = service.platform === 'iOS';
    const url = `${SITE.url}${productPath(service)}`;
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': mobile ? 'MobileApplication' : 'WebApplication',
                '@id': `${url}#app`,
                name: service.name,
                description: page.seo.description,
                url,
                applicationCategory: 'EducationalApplication',
                ...(mobile
                    ? { operatingSystem: service.android ? 'iOS, Android' : 'iOS', downloadUrl: service.href, installUrl: service.href }
                    : { operatingSystem: 'Web', sameAs: service.href }),
                screenshot: page.screens.map((s) => `${SITE.url}${s.src}`),
                // Tải/dùng miễn phí (có Premium/In-App-Kauf). Google cần offers để hiện rich result ứng dụng.
                // aggregateRating chỉ thêm khi có số đánh giá thật từ App Store.
                offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
                inLanguage: ['de', 'en', 'vi'],
                publisher: { '@type': 'Organization', '@id': `${SITE.url}/#organization`, name: COMPANY.legalName, url: SITE.url },
            },
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
                { name: 'CKK', path: '/' },
                { name: service.name, path: productPath(service) },
            ]),
        ],
    };
}
