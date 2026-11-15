'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Service } from '@/lib/company/services';
import type { Screen } from '@/lib/company/productPages';
import { useLocale } from '@/components/company/LocaleContext';
import { ArrowRightIcon } from '@/components/company/icons';

export const inkText = (item: { onInk: 'light' | 'dark' }) => (item.onInk === 'light' ? '#fff' : 'var(--ink)');

/** Ảnh chụp thật của sản phẩm, đặt trong một con tem trắng có răng cưa */
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
        <figure className={`perf p-2 md:p-2.5 ${className}`}>
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

/** Nút bắt đầu học (trong site) kèm một dòng ghi chú. Dùng trên dải màu của sản phẩm. */
export function StartButton({ service }: { service: Service }) {
    const { locale } = useLocale();
    const copy = service.copy[locale];
    return (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
                href={service.href}
                className="inline-flex min-h-12 items-center gap-2.5 bg-[var(--ink)] px-5 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-white hover:text-[var(--ink)]"
            >
                {copy.action}
                <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="text-sm">{copy.note}</p>
        </div>
    );
}
