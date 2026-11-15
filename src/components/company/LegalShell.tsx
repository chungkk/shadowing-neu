'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { LEGAL_UPDATED } from '@/biz/lib/site';
import { useLocale } from '@/biz/contexts/LocaleContext';
import type { Locale } from '@/biz/contexts/LocaleContext';
import { BriefcaseIcon, DocumentIcon, LockIcon, MailIcon, ReceiptIcon, TrashIcon } from '@/biz/components/icons';

type Icon = ComponentType<{ className?: string }>;

export type LegalNavItem = { href: string; icon: Icon } & Record<Locale, string>;

const NAV: LegalNavItem[] = [
    { href: '/support', icon: MailIcon, de: 'Support-Center', en: 'Support center', vi: 'Trung tâm hỗ trợ' },
    { href: '/impressum', icon: BriefcaseIcon, de: 'Impressum', en: 'Legal notice', vi: 'Thông tin pháp lý' },
    { href: '/privacy', icon: LockIcon, de: 'Datenschutz', en: 'Privacy policy', vi: 'Chính sách bảo mật' },
    { href: '/terms', icon: DocumentIcon, de: 'Nutzungsbedingungen', en: 'Terms of use', vi: 'Điều khoản sử dụng' },
    { href: '/refund', icon: ReceiptIcon, de: 'Käufe & Erstattung', en: 'Purchases & refunds', vi: 'Mua hàng & hoàn tiền' },
    { href: '/delete-account', icon: TrashIcon, de: 'Datenlöschung', en: 'Data deletion', vi: 'Xoá dữ liệu' },
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
}

export default function LegalShell({ title, intro, content, showUpdated = true, nav = NAV }: LegalShellProps) {
    const { locale } = useLocale();
    const pathname = usePathname();
    const l = LABELS[locale];

    return (
        <div>
            <section className="border-b border-[var(--ink)]/15">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-12 md:pt-20 md:pb-14">
                    <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-balance hyphens-auto [overflow-wrap:anywhere]">{title[locale]}</h1>
                    {intro && <p className="mt-4 max-w-2xl text-lg text-[var(--ink)]/75 leading-relaxed">{intro[locale]}</p>}
                    {showUpdated && (
                        <p className="mt-6 text-sm text-[var(--ink)]/65">
                            {l.updated}: {LEGAL_UPDATED[locale]}
                        </p>
                    )}
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-16 grid lg:grid-cols-[1fr_260px] gap-12">
                <article className="legal-prose min-w-0">{content[locale]}</article>

                <aside className="lg:sticky lg:top-24 self-start">
                    <p className="text-sm font-semibold mb-3">{l.more}</p>
                    <nav className="border border-[var(--ink)]/20 p-2 bg-white">
                        {nav.map((item) => {
                            const Icon = item.icon;
                            const active = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-white text-[var(--ink-ultra)] ring-1 ring-[var(--ink)]/20' : 'text-[var(--ink)]/80 hover:bg-white hover:text-[var(--ink)]'}`}
                                >
                                    <Icon className={`w-4 h-4 ${active ? 'text-[var(--ink-ultra)]' : 'text-[var(--ink)]/75'}`} />
                                    {item[locale]}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>
            </div>
        </div>
    );
}
