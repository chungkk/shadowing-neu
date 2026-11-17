'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { BriefcaseBusiness, ChevronDown, Globe, GraduationCap, Info, LifeBuoy } from 'lucide-react';
import { LOCALES, useLocale, useT } from '@/components/company/LocaleContext';
import type { Locale } from '@/components/company/LocaleContext';

// Hàng tab nhỏ dưới thanh trên cùng của các trang thông tin (cùng khuôn DeutschSubnav ở src/components/Sidebar.tsx):
// bên trái là các trang chính (cuộn ngang trên điện thoại), bên phải là MỘT nút chọn ngôn ngữ (select gốc → gọn ở 390px).
const ICONS = [Info, GraduationCap, BriefcaseBusiness, LifeBuoy]; // cùng thứ tự với COPY.*.nav
const LANG_NAMES: Record<Locale, string> = { de: 'Deutsch', en: 'English', vi: 'Tiếng Việt' };
const COPY = {
    de: {
        nav: [
            { href: '/about', label: 'Über HalloVN' },
            { href: '/shadowing', label: 'Lernplattform' },
            { href: '/about#auftrag', label: 'Auftragsarbeit' },
            { href: '/support', label: 'Support' },
        ],
        aria: 'Über HalloVN',
        lang: 'Sprache wählen',
    },
    en: {
        nav: [
            { href: '/about', label: 'About HalloVN' },
            { href: '/shadowing', label: 'Learning platform' },
            { href: '/about#auftrag', label: 'Custom software' },
            { href: '/support', label: 'Support' },
        ],
        aria: 'About HalloVN',
        lang: 'Choose language',
    },
    vi: {
        nav: [
            { href: '/about', label: 'Về HalloVN' },
            { href: '/shadowing', label: 'Nền tảng học' },
            { href: '/about#auftrag', label: 'Làm theo yêu cầu' },
            { href: '/support', label: 'Hỗ trợ' },
        ],
        aria: 'Về HalloVN',
        lang: 'Chọn ngôn ngữ',
    },
};

export default function InfoSubnav() {
    const t = useT(COPY);
    const { locale, setLocale } = useLocale();
    const pathname = usePathname();
    // Mục khớp dài nhất (/shadowing/support → "Lernplattform"); /about#auftrag chỉ là neo trong /about nên không tính
    const current = t.nav
        .filter((it) => !it.href.includes('#') && (pathname === it.href || pathname.startsWith(it.href + '/')))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    // Điện thoại: hàng tab cuộn ngang → đưa tab đang chọn vào tầm nhìn (chỉ cuộn ngang, không kéo trang)
    const navRef = useRef<HTMLElement>(null);
    useEffect(() => {
        const nav = navRef.current;
        const on = nav?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!nav || !on) return;
        const overRight = on.offsetLeft + on.offsetWidth - (nav.scrollLeft + nav.clientWidth);
        if (overRight > 0) nav.scrollLeft += overRight + 8;
        else if (on.offsetLeft < nav.scrollLeft) nav.scrollLeft = on.offsetLeft;
    }, [current]);

    return (
        <div data-sec="ink" className="mx-auto flex w-full max-w-6xl items-end gap-3 px-4 pt-3 md:px-6">
            {/* Điều hướng phụ của khu vực: .tabs-line + .tab (gạch chân màu mực — data-sec="ink" — ở tab aria-current="page") */}
            <nav ref={navRef} aria-label={t.aria} className="tabs-line relative min-w-0 flex-1">
                {t.nav.map((it, i) => {
                    const Icon = ICONS[i];
                    return (
                        <Link key={it.href} href={it.href} aria-current={it.href === current ? 'page' : undefined} className="tab min-h-11 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-accent">
                            {Icon && <Icon className="size-4 max-sm:hidden" aria-hidden="true" />}
                            {it.label}
                        </Link>
                    );
                })}
            </nav>
            {/* Chọn ngôn ngữ: select gốc phủ trong suốt lên viên thuốc (bàn phím, trình đọc màn hình, bảng chọn của điện thoại đều dùng được) */}
            <label className="chip relative mb-1.5 shrink-0 gap-1 px-2.5 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
                <Globe className="size-4" aria-hidden="true" />
                <span aria-hidden="true" className="uppercase">
                    {locale}
                </span>
                <ChevronDown className="size-3.5" aria-hidden="true" />
                <select
                    aria-label={t.lang}
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                >
                    {LOCALES.map((l) => (
                        <option key={l} value={l} lang={l}>
                            {LANG_NAMES[l]}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}
