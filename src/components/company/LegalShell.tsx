'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { BadgeEuro, FileText, Landmark, LifeBuoy, ShieldCheck } from 'lucide-react';
import Mascot from '@/components/Mascot';
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
    /** Nhãn sticker vàng trên tiêu đề (khi không hiện ngày cập nhật) */
    badge?: Record<Locale, string>;
    /**
     * prose (mặc định): văn bản pháp lý dài trong một thẻ, cột chữ ~70 ký tự.
     * cards: nội dung tự chia thành các thẻ (.card) — trang hỗ trợ.
     */
    variant?: 'prose' | 'cards';
}

/** "Các trang khác": thẻ kiểu app, mỗi trang một hàng nút; trang đang xem tô xanh như tab đang chọn */
function MoreNav({ nav, title, locale }: { nav: LegalNavItem[]; title: string; locale: Locale }) {
    const pathname = usePathname();
    return (
        <nav aria-label={title} className="card flex flex-col gap-2">
            <h2 className="label px-1 pt-1 text-muted">{title}</h2>
            <ul className="grid gap-1.5 max-lg:sm:grid-cols-2">
                {nav.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={`flex min-h-11 items-center gap-2.5 rounded-2xl border-2 px-3 py-2 text-sm font-bold transition ${
                                    active ? 'border-ink bg-accent text-white shadow-[0_3px_0_var(--ink)]' : 'border-transparent hover:border-ink/25 hover:bg-card-2'
                                }`}
                            >
                                <Icon className={`size-4.5 shrink-0 ${active ? '' : 'text-link'}`} />
                                <span className="min-w-0">{item[locale]}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

export default function LegalShell({ title, intro, content, showUpdated = true, nav = NAV, badge, variant = 'prose' }: LegalShellProps) {
    const { locale } = useLocale();
    const l = LABELS[locale];
    const sticker = showUpdated ? `${l.updated}: ${LEGAL_UPDATED[locale]}` : badge?.[locale];

    return (
        <div className="page gap-6 md:gap-8">
            {/* Đầu trang như hero của app: thẻ sticker, linh vật, nhãn vàng nghiêng */}
            <header className="sticker grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 p-4 sm:gap-x-6 sm:p-6">
                <Mascot className="bob size-16 sm:row-span-2 sm:size-28" />
                <div className="flex min-w-0 flex-col items-start gap-1.5">
                    {sticker && (
                        <span className="-rotate-2 rounded-2xl rounded-bl-sm border-2 border-ink bg-gold px-3 py-0.5 text-sm font-extrabold text-black">
                            {sticker}
                        </span>
                    )}
                    <h1 className="page-title text-balance hyphens-auto [overflow-wrap:anywhere]">{title[locale]}</h1>
                </div>
                {intro && <p className="col-span-2 max-w-[65ch] text-muted sm:col-span-1">{intro[locale]}</p>}
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
                {variant === 'prose' ? (
                    <article className="card legal-prose min-w-0 p-5 sm:p-8">{content[locale]}</article>
                ) : (
                    <div className="flex min-w-0 flex-col gap-6">{content[locale]}</div>
                )}
                <aside className="lg:sticky lg:top-24">
                    <MoreNav nav={nav} title={l.more} locale={locale} />
                </aside>
            </div>
        </div>
    );
}
