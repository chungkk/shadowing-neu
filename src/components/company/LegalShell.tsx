'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { BadgeEuro, FileText, Landmark, LifeBuoy, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { LEGAL_UPDATED } from '@/lib/company/site';
import { useLocale } from '@/components/company/LocaleContext';
import type { Locale } from '@/components/company/LocaleContext';

type Icon = ComponentType<{ className?: string }>;

export type LegalNavItem = { href: string; icon: Icon } & Record<Locale, string>;

const NAV: LegalNavItem[] = [
    { href: '/support', icon: LifeBuoy, de: 'Support-Center', en: 'Support center', vi: 'Trung tâm hỗ trợ' },
    { href: '/impressum', icon: Landmark, de: 'Impressum', en: 'Legal notice', vi: 'Thông tin pháp lý' },
    { href: '/privacy', icon: ShieldCheck, de: 'Datenschutz', en: 'Privacy policy', vi: 'Chính sách bảo mật' },
    { href: '/terms', icon: FileText, de: 'Nutzungsbedingungen', en: 'Terms of use', vi: 'Điều khoản sử dụng' },
    { href: '/refund', icon: BadgeEuro, de: 'Käufe & Erstattung', en: 'Purchases & refunds', vi: 'Mua hàng & hoàn tiền' },
];

const LABELS = {
    de: { updated: 'Stand', more: 'Weitere Seiten' },
    en: { updated: 'Last updated', more: 'More pages' },
    vi: { updated: 'Cập nhật', more: 'Các trang khác' },
};

interface LegalShellProps {
    title: Record<Locale, string>;
    intro?: Record<Locale, ReactNode>;
    /** Inhalt je Sprache */
    content: Record<Locale, ReactNode>;
    showUpdated?: boolean;
    /** Liên kết riêng của từng sản phẩm; mặc định là các trang chung */
    nav?: LegalNavItem[];
    /** Chữ nhỏ trên bìa (khi không hiện ngày cập nhật) */
    badge?: Record<Locale, string>;
    /**
     * prose (mặc định): văn bản pháp lý dài trong một thẻ, cột chữ ~70 ký tự.
     * cards: nội dung tự chia thành các thẻ (.card) — trang hỗ trợ.
     */
    variant?: 'prose' | 'cards';
}

/** "Các trang khác": mục lục kiểu trang vở — mỗi trang một dòng kẻ chấm; trang đang xem in đậm, có dấu mực */
function MoreNav({ nav, title, locale }: { nav: LegalNavItem[]; title: string; locale: Locale }) {
    const pathname = usePathname();
    return (
        <nav aria-label={title} className="card flex flex-col gap-1 p-4">
            <h2 className="label pb-1">{title}</h2>
            <ul className="divide-y divide-line max-lg:sm:grid max-lg:sm:grid-cols-2 max-lg:sm:gap-x-6 max-lg:sm:divide-y-0">
                {nav.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={`group flex min-h-10 items-center gap-2.5 py-2 text-sm transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                                    active ? 'font-semibold text-foreground' : 'font-medium text-muted hover:text-link'
                                }`}
                            >
                                <Icon className={`size-[18px] shrink-0 ${active ? 'text-foreground' : 'text-muted group-hover:text-link'}`} aria-hidden="true" />
                                <span className="min-w-0 flex-1">{item[locale]}</span>
                                {active && <span className="size-2 shrink-0 rounded-full bg-foreground" aria-hidden="true" />}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

export default function LegalShell({ title, intro, content, showUpdated = true, nav, badge, variant = 'prose' }: LegalShellProps) {
    const { locale } = useLocale();
    const pathname = usePathname();
    const l = LABELS[locale];
    const sticker = showUpdated ? `${l.updated}: ${LEGAL_UPDATED[locale]}` : badge?.[locale];
    // Ẩn mục /refund khỏi menu mặc định của HalloVN (vì HalloVN miễn phí, không bán gói); chỉ hiện khi đang mở trực tiếp /refund
    const visibleNav = nav ?? NAV.filter((item) => item.href !== '/refund' || pathname === '/refund');
    // Icon trên bìa: icon của trang đang xem trong mục lục (pháp lý / hỗ trợ), không có thì tờ giấy
    const icon = [...visibleNav, ...NAV].find((item) => item.href === pathname)?.icon ?? (variant === 'cards' ? LifeBuoy : FileText);

    return (
        <div data-sec="ink" className="page gap-6 md:gap-8">
            {/* Đầu trang chữ ký: bìa vở mực + nhãn vở (PageHeader). Trang hỗ trợ có linh vật, văn bản pháp lý thì không */}
            <PageHeader
                sec="ink"
                icon={icon}
                title={<span className="text-balance hyphens-auto [overflow-wrap:anywhere]">{title[locale]}</span>}
                sub={intro?.[locale]}
                // Trang hỗ trợ có linh vật ngồi ở góc phải bìa → không đặt chữ ở đó (tránh bị che trên điện thoại)
                meta={variant !== 'cards' && sticker && <span className="opacity-85">{sticker}</span>}
                mascot={variant === 'cards'}
            />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
                {variant === 'prose' ? (
                    <article className="card legal-prose min-w-0 p-5 sm:p-8 lg:p-10">{content[locale]}</article>
                ) : (
                    <div className="flex min-w-0 flex-col gap-6">{content[locale]}</div>
                )}
                <aside className="lg:sticky lg:top-24">
                    <MoreNav nav={visibleNav} title={l.more} locale={locale} />
                </aside>
            </div>
        </div>
    );
}
