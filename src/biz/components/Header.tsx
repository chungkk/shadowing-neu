'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BrandMark, CloseIcon, MenuIcon } from '@/biz/components/icons';
import { useLocale, useT } from '@/biz/contexts/LocaleContext';
import { LOCALES } from '@/biz/contexts/LocaleContext';

const COPY = {
    de: {
        nav: [
            { href: '/', label: 'Lernen & Anmelden' },
            { href: '/fuehrerschein', label: 'Führerschein' },
            { href: '/lid', label: 'Leben in Deutschland' },
            { href: '/shadowing', label: 'Deutsch lernen' },
            { href: '/about#auftrag', label: 'Auftragsarbeit' },
            { href: '/support', label: 'Support' },
        ],
        cta: 'Projekt anfragen',
        home: 'CKK – Startseite',
        open: 'Menü öffnen',
        close: 'Menü schließen',
        lang: 'Sprache wählen',
    },
    en: {
        nav: [
            { href: '/', label: 'Learn & sign in' },
            { href: '/fuehrerschein', label: 'Driving test' },
            { href: '/lid', label: 'Leben in Deutschland' },
            { href: '/shadowing', label: 'Learn German' },
            { href: '/about#auftrag', label: 'Custom software' },
            { href: '/support', label: 'Support' },
        ],
        cta: 'Start a project',
        home: 'CKK – Home',
        open: 'Open menu',
        close: 'Close menu',
        lang: 'Choose language',
    },
    vi: {
        nav: [
            { href: '/', label: 'Học & đăng nhập' },
            { href: '/fuehrerschein', label: 'Thi lái xe' },
            { href: '/lid', label: 'Leben in Deutschland' },
            { href: '/shadowing', label: 'Học tiếng Đức' },
            { href: '/about#auftrag', label: 'Làm theo yêu cầu' },
            { href: '/support', label: 'Hỗ trợ' },
        ],
        cta: 'Gửi yêu cầu',
        home: 'CKK – Trang chủ',
        open: 'Mở menu',
        close: 'Đóng menu',
        lang: 'Chọn ngôn ngữ',
    },
};

function LanguageSwitch({ id }: { id: string }) {
    const { locale, setLocale } = useLocale();
    const t = useT(COPY);
    return (
        <div role="group" aria-label={t.lang} className="inline-flex">
            {LOCALES.map((l) => (
                <button
                    key={l}
                    id={`${id}-${l}`}
                    type="button"
                    onClick={() => setLocale(l)}
                    aria-pressed={locale === l}
                    className={`min-h-10 px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${locale === l ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink)] hover:bg-[var(--ink)]/10'}`}
                >
                    {l}
                </button>
            ))}
        </div>
    );
}

export default function Header() {
    const t = useT(COPY);
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const isActive = (href: string) => !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`));

    return (
        <header
            className="fixed top-0 inset-x-0 z-50 bg-[var(--paper)] border-b border-[var(--ink)]/20"
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
                <Link href="/about" id="header-logo" className="flex items-center gap-2.5 shrink-0" aria-label={t.home}>
                    <BrandMark className="w-8 h-8" />
                    <span className="font-display text-xl font-bold tracking-tight">
                        CKK
                    </span>
                </Link>

                <nav className="hidden lg:flex items-center gap-0.5" aria-label="Hauptnavigation">
                    {t.nav.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            id={`header-nav-${link.href.replace(/[^a-z]/g, "") || "learn"}`}
                            className={`px-2.5 py-2 text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline ${isActive(link.href) ? 'underline' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:block">
                        <LanguageSwitch id="header-lang" />
                    </div>
                    <Link
                        id="header-cta"
                        href="/about#auftrag"
                        className="hidden sm:inline-flex min-h-10 items-center px-4 py-2 text-sm font-semibold text-white bg-[var(--ink-ultra)] hover:bg-[var(--ink)] transition-colors"
                    >
                        {t.cta}
                    </Link>
                    <button
                        id="header-mobile-toggle"
                        type="button"
                        onClick={() => setOpen(!open)}
                        className="lg:hidden p-3 -mr-3 hover:bg-[var(--ink)]/10"
                        aria-label={open ? t.close : t.open}
                        aria-expanded={open}
                    >
                        {open ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </div>

            {open && (
                <nav className="lg:hidden border-t border-[var(--ink)]/20 bg-[var(--paper)] px-4 pb-5 pt-2" aria-label="Mobile Navigation">
                    {t.nav.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className="block px-3 py-3 text-base font-medium hover:bg-[var(--ink)]/10"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="mt-3 flex items-center justify-between gap-3 px-3">
                        <LanguageSwitch id="mobile-lang" />
                        <Link
                            href="/about#auftrag"
                            onClick={() => setOpen(false)}
                            className="flex-1 min-h-10 py-2.5 bg-[var(--ink-ultra)] text-white text-sm font-semibold text-center"
                        >
                            {t.cta}
                        </Link>
                    </div>
                </nav>
            )}
        </header>
    );
}
