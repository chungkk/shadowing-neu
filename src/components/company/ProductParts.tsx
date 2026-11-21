'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Service } from '@/lib/company/services';
import type { Screen } from '@/lib/company/productPages';
import { useLocale } from '@/components/company/LocaleContext';

/** Link chữ "Xem thêm →" như trên trang chủ app (src/app/(app)/page.tsx) */
export const moreLink = 'inline-flex items-center gap-1 text-sm font-extrabold text-link hover:underline';

/** Ảnh chụp thật của sản phẩm, đóng khung như thẻ sticker của app */
export function Shot({
    screen,
    alt,
    sizes,
    priority = false,
    className = '',
}: {
    screen: Screen;
    alt: string;
    sizes: string;
    priority?: boolean;
    className?: string;
}) {
    const crop = screen.cropTop ?? 0;
    const image = <Image src={screen.src} alt={alt} width={screen.width} height={screen.height} sizes={sizes} priority={priority} className="block h-auto w-full" />;
    return (
        <figure className={`card overflow-hidden p-0 ${className}`}>
            {crop ? (
                // Cắt bỏ dải trên cùng của ảnh chụp (margin % tính theo chiều rộng nên tỉ lệ luôn đúng)
                <div className="overflow-hidden" style={{ aspectRatio: `${screen.width} / ${screen.height - crop}` }}>
                    <div style={{ marginTop: `-${(crop / screen.width) * 100}%` } as CSSProperties}>{image}</div>
                </div>
            ) : (
                image
            )}
        </figure>
    );
}

/** Nút bắt đầu học (trong site) kèm một dòng ghi chú */
export function StartButton({ service, center = false }: { service: Service; center?: boolean }) {
    const { locale } = useLocale();
    const copy = service.copy[locale];
    return (
        <div className={`flex flex-col gap-2 ${center ? 'items-center' : 'items-start'}`}>
            <Link href={service.href} className="btn btn-primary btn-lg max-sm:w-full">
                {copy.action}
                <ArrowRight className="size-5" />
            </Link>
            <p className="text-sm text-muted">{copy.note}</p>
        </div>
    );
}
