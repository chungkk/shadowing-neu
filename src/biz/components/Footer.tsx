'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { COMPANY, SITE } from '@/biz/lib/site';
import { SERVICES, productPath } from '@/biz/lib/services';
import { BrandMark } from '@/biz/components/icons';
import { useT } from '@/biz/contexts/LocaleContext';
import ConsentSettings from '@/biz/components/ConsentSettings';

// Năm hiện tại đọc trên trình duyệt (prerender không được dùng new Date() — cacheComponents)
const noop = () => () => {};
function CurrentYear() {
    return useSyncExternalStore(noop, () => new Date().getFullYear(), () => null);
}

const COPY = {
    de: {
        tagline: 'Software, Apps und Web-Anwendungen aus Halle (Saale).',
        products: 'Produkte',
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
            { label: 'Datenlöschung', href: '/delete-account' },
        ],
        consent: 'Datenschutz-Einstellungen',
        rights: 'Alle Rechte vorbehalten.',
        trademark: 'App Store und Apple sind Marken der Apple Inc.',
    },
    en: {
        tagline: 'Software, apps and web applications from Halle (Saale), Germany.',
        products: 'Products',
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
            { label: 'Data deletion', href: '/delete-account' },
        ],
        consent: 'Privacy settings',
        rights: 'All rights reserved.',
        trademark: 'App Store and Apple are trademarks of Apple Inc.',
    },
    vi: {
        tagline: 'Phần mềm, app và ứng dụng web từ Halle (Saale), Đức.',
        products: 'Sản phẩm',
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
            { label: 'Xoá dữ liệu', href: '/delete-account' },
        ],
        consent: 'Cài đặt quyền riêng tư',
        rights: 'Bảo lưu mọi quyền.',
        trademark: 'App Store và Apple là thương hiệu của Apple Inc.',
    },
};

const linkClass = 'underline-offset-4 hover:underline';

export default function Footer() {
    const t = useT(COPY);
    const columns = [
        { title: t.company, links: t.companyLinks },
        { title: t.legal, links: t.legalLinks },
    ];
    return (
        <footer className="on-ink bg-[var(--ink)] text-white">
            <div aria-hidden="true" className="flex h-2">
                {SERVICES.map((service) => (
                    <span key={service.id} className="flex-1" style={{ background: service.ink }} />
                ))}
                <span className="flex-1 bg-[var(--ink-ultra)]" />
            </div>
            <div className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-12">
                    <div className="col-span-2 md:col-span-4">
                        <Link href="/about" className="inline-flex items-center gap-2.5">
                            <BrandMark className="h-8 w-8" />
                            <span className="font-display text-xl font-bold tracking-tight">CKK</span>
                        </Link>
                        <p className="mt-4 max-w-xs text-[0.95rem] leading-snug">{t.tagline}</p>
                    </div>
                    <nav aria-label={t.products} className="col-span-2 min-w-0 sm:col-span-1 md:col-span-3">
                        <h2 className="font-display font-bold">{t.products}</h2>
                        <ul className="mt-3 space-y-2 text-[0.95rem]">
                            {SERVICES.map((service) => (
                                <li key={service.id}>
                                    <Link href={productPath(service)} className={linkClass}>
                                        {service.name}
                                    </Link>
                                </li>
                            ))}
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
                <div className="mt-12 flex flex-col justify-between gap-2 border-t border-white/25 pt-5 text-sm text-white/80 sm:flex-row">
                    <p>
                        © <CurrentYear /> {COMPANY.legalName} · {SITE.domain}. {t.rights}
                    </p>
                    <p>{t.trademark}</p>
                </div>
            </div>
        </footer>
    );
}
