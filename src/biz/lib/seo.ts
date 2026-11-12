// Metadata dùng chung cho mọi trang. Trang con khai báo openGraph sẽ thay toàn bộ openGraph của
// layout (Next chỉ gộp nông), nên siteName/locale phải được đặt lại ở đây cho từng trang.
import type { Metadata } from 'next';
import { SITE } from '@/biz/lib/site';

export const OG_LOCALE = { locale: 'de_DE', alternateLocale: ['en_US', 'vi_VN'] };

interface PageSeo {
    /** Tiêu đề trang; layout tự thêm hậu tố " | CKK" trừ khi absolute = true */
    title: string;
    description: string;
    /** Đường dẫn bắt đầu bằng "/" */
    path: string;
    absolute?: boolean;
    images?: { url: string; width: number; height: number; alt?: string }[];
    /** Trang không muốn xuất hiện trên Google (vẫn cho bot đọc để thấy noindex) */
    noindex?: boolean;
}

/** Ảnh chia sẻ chung (src/app/opengraph-image.tsx). Trang có opengraph-image riêng sẽ được Next ưu tiên. */
const DEFAULT_OG_IMAGES = [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'CKK – Software, Apps und Web-Anwendungen' }];

export function pageMetadata({ title, description, path, absolute, images = DEFAULT_OG_IMAGES, noindex }: PageSeo): Metadata {
    const fullTitle = absolute ? title : `${title} | ${SITE.name}`;
    return {
        title: absolute ? { absolute: title } : title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type: 'website',
            url: `${SITE.url}${path}`,
            siteName: SITE.fullName,
            title: fullTitle,
            description,
            ...OG_LOCALE,
            images,
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
            description,
            images: images.map((i) => i.url),
        },
        ...(noindex ? { robots: { index: false, follow: true } } : {}),
    };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
    return {
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: `${SITE.url}${item.path}`,
        })),
    };
}
