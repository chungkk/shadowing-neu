'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { COMPANY, SITE } from '@/lib/company/site';
import { LEARN_AREAS, PLATFORM, productPath } from '@/lib/company/services';
import { BrandMark } from '@/components/company/icons';
import { useLocale, useT } from '@/components/company/LocaleContext';
import ConsentSettings from '@/components/company/ConsentSettings';

// Năm hiện tại đọc trên trình duyệt (prerender không được dùng new Date() — cacheComponents)
const noop = () => () => {};
function CurrentYear() {
    return useSyncExternalStore(noop, () => new Date().getFullYear(), () => null);
}

const COPY = {
    de: {
        tagline: 'Deutsch, Führerschein und Leben in Deutschland – auf Vietnamesisch erklärt. Aus Halle (Saale).',
        products: 'Lernen',
        platform: 'Über die Lernplattform',
        company: 'Unternehmen',
        companyLinks: [
            { label: 'Auftragsarbeit', href: '/about#auftrag' },
            { label: 'Kontakt', href: '/about#contact' },
            { label: 'Support-Center', href: '/support' },
        ],
        legal: 'Rechtliches',
        legalLinks: [
            { label: 'Impressum', href: '/impressum' },
            { label: 'Datenschutz', href: '/privacy' },
            { label: 'Nutzungsbedingungen', href: '/terms' },
            { label: 'Käufe & Erstattung', href: '/refund' },
        ],
        consent: 'Datenschutz-Einstellungen',
        rights: 'Alle Rechte vorbehalten.',
    },
    en: {
        tagline: 'German, the driving test and Leben in Deutschland – explained in Vietnamese. From Halle (Saale), Germany.',
        products: 'Learn',
        platform: 'About the platform',
        company: 'Company',
        companyLinks: [
            { label: 'Custom software', href: '/about#auftrag' },
            { label: 'Contact', href: '/about#contact' },
            { label: 'Support center', href: '/support' },
        ],
        legal: 'Legal',
        legalLinks: [
            { label: 'Legal notice', href: '/impressum' },
            { label: 'Privacy policy', href: '/privacy' },
            { label: 'Terms of use', href: '/terms' },
            { label: 'Purchases & refunds', href: '/refund' },
        ],
        consent: 'Privacy settings',
        rights: 'All rights reserved.',
    },
    vi: {
        tagline: 'Tiếng Đức, lái xe và Leben in Deutschland, giải thích bằng tiếng Việt. Từ Halle (Saale), Đức.',
        products: 'Học',
        platform: 'Về nền tảng học',
        company: 'Công ty',
        companyLinks: [
            { label: 'Làm theo yêu cầu', href: '/about#auftrag' },
            { label: 'Liên hệ', href: '/about#contact' },
            { label: 'Trung tâm hỗ trợ', href: '/support' },
        ],
        legal: 'Pháp lý',
        legalLinks: [
            { label: 'Thông tin pháp lý', href: '/impressum' },
            { label: 'Chính sách bảo mật', href: '/privacy' },
            { label: 'Điều khoản sử dụng', href: '/terms' },
            { label: 'Mua hàng & hoàn tiền', href: '/refund' },
        ],
        consent: 'Cài đặt quyền riêng tư',
        rights: 'Bảo lưu mọi quyền.',
    },
};

const linkClass = 'underline-offset-4 hover:underline';

export default function Footer() {
    const t = useT(COPY);
    const { locale } = useLocale();
    const columns = [
        { title: t.company, links: t.companyLinks },
        { title: t.legal, links: t.legalLinks },
    ];
    return (
        <footer className="on-ink bg-[var(--ink)] text-white">
            <div aria-hidden="true" className="flex h-2">
                {LEARN_AREAS.map((area) => (
                    <span key={area.id} className="flex-1" style={{ background: area.ink }} />
                ))}
                <span className="flex-1 bg-[var(--ink-ultra)]" />
            </div>
            <div className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-12">
                    <div className="col-span-2 md:col-span-4">
                        <Link href="/about" className="inline-flex items-center gap-2.5">
                            <BrandMark className="h-8 w-8" />
                            <span className="font-display text-xl font-bold tracking-tight">HalloVN</span>
                        </Link>
                        <p className="mt-4 max-w-xs text-[0.95rem] leading-snug">{t.tagline}</p>
                    </div>
                    <nav aria-label={t.products} className="col-span-2 min-w-0 sm:col-span-1 md:col-span-3">
                        <h2 className="font-display font-bold">{t.products}</h2>
                        <ul className="mt-3 space-y-2 text-[0.95rem]">
                            {LEARN_AREAS.map((area) => (
                                <li key={area.id}>
                                    <Link href={area.href} className={linkClass}>
                                        {area.copy[locale].title}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link href={productPath(PLATFORM)} className={linkClass}>
                                    {t.platform}
                                </Link>
                            </li>
                        </ul>
                    </nav>
                    {columns.map((col) => (
                        <nav key={col.title} aria-label={col.title} className="min-w-0 break-words hyphens-auto md:col-span-2 md:last:col-span-3">
                            <h2 className="font-display font-bold">{col.title}</h2>
                            <ul className="mt-3 space-y-2 text-[0.95rem]">
                                {col.links.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className={linkClass}>
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                                {col.title === t.legal && (
                                    <li>
                                        <ConsentSettings label={t.consent} className={linkClass} />
                                    </li>
                                )}
                            </ul>
                        </nav>
                    ))}
                </div>
                <div className="mt-12 border-t border-white/25 pt-5 text-sm text-white/80">
                    <p>
                        © <CurrentYear /> {COMPANY.legalName} · {SITE.domain}. {t.rights}
                    </p>
                </div>
            </div>
        </footer>
    );
}
