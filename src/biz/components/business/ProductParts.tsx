'use client';

import Image from 'next/image';
import type { Service } from '@/biz/lib/services';
import type { Screen } from '@/biz/lib/productPages';
import { useLocale } from '@/biz/contexts/LocaleContext';
import { AndroidIcon, AppleIcon, ArrowRightIcon } from '@/biz/components/icons';

export const inkText = (service: Service) => (service.onInk === 'light' ? '#fff' : 'var(--ink)');

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
    return (
        <figure className={`perf p-2 md:p-2.5 ${className}`}>
            <Image src={screen.src} alt={alt} width={screen.width} height={screen.height} sizes={sizes} priority={priority} className="block h-auto w-full" />
        </figure>
    );
}

/** Nút tải: App Store hoặc trang web, kèm APK Android nếu có. Dùng trên dải màu của sản phẩm. */
export function StoreButtons({ service }: { service: Service }) {
    const { locale } = useLocale();
    const copy = service.copy[locale];
    return (
        <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <a
                    href={service.href}
                    // Link ngoài (App Store) mở tab mới; Deutsch Shadowing là app học ngay trên ckk.biz ("/")
                    {...(service.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="inline-flex min-h-12 items-center gap-2.5 bg-[var(--ink)] px-5 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-white hover:text-[var(--ink)]"
                >
                    {service.platform === 'iOS' ? <AppleIcon className="h-5 w-5" /> : null}
                    {copy.action}
                    {service.platform === 'Web' ? <ArrowRightIcon className="h-5 w-5" /> : null}
                </a>
                <p className="text-sm">{copy.note}</p>
            </div>
            {service.android && (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <a
                        href={service.android.href}
                        download
                        className="inline-flex min-h-12 items-center gap-2.5 border-2 border-[var(--ink)] bg-white px-5 py-3 font-display text-lg font-bold text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-white"
                    >
                        <AndroidIcon className="h-5 w-5" />
                        {service.android.copy[locale].action}
                    </a>
                    <p className="text-sm">{service.android.copy[locale].note}</p>
                </div>
            )}
        </>
    );
}
