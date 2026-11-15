'use client';

import Link from 'next/link';
import LegalShell from '@/biz/components/business/LegalShell';
import type { LegalNavItem } from '@/biz/components/business/LegalShell';
import LegalText from '@/biz/components/business/LegalText';
import SupportForm from '@/biz/components/business/SupportForm';
import { LEGAL_PRODUCTS, legalProduct } from '@/biz/lib/legal';
import { websitePrivacy } from '@/biz/lib/legal/website';
import type { LegalProduct } from '@/biz/lib/legal/types';
import { SITE } from '@/biz/lib/site';
import { useT } from '@/biz/contexts/LocaleContext';
import type { Locale } from '@/biz/contexts/LocaleContext';
import { BriefcaseIcon, DocumentIcon, LockIcon, MailIcon, PlusIcon, ReceiptIcon, TrashIcon } from '@/biz/components/icons';

const LOCALES: Locale[] = ['de', 'en', 'vi'];

const COPY = {
    de: {
        support: 'Support',
        privacy: 'Datenschutz',
        supportIntro: (name: string) => `Häufige Fragen und Kontakt zu ${name}.`,
        privacyTitle: 'Datenschutzerklärung',
        privacyIntro: (name: string) => `Welche Daten ${name} verarbeitet und welche Rechte Sie haben.`,
        faq: 'Häufige Fragen',
        contact: 'Kontakt',
        contactDesc: 'Keine Antwort gefunden? Schreiben Sie uns. Wir melden uns in der Regel innerhalb von 1–2 Werktagen.',
        refund: 'Käufe & Erstattung',
        deletion: 'Datenlöschung',
        terms: 'Nutzungsbedingungen',
        all: 'Alle Produkte',
        allPrivacy: 'Alle Datenschutzerklärungen',
        hubTitle: 'Support-Center',
        hubIntro: 'Wählen Sie Ihr Produkt. Dort finden Sie Antworten, Kontakt und die Datenschutzerklärung.',
        products: 'Produkte',
        hubFormTitle: 'Allgemeine Anfrage',
        topics: ['Daten & Datenschutz', 'Feedback', 'Kooperation', 'Sonstiges'],
        websitePrivacy: 'Datenschutzerklärung der Website',
        websiteIntro: 'Diese Seite gilt für die Website hallovn.de. Für unsere Apps und Dienste gilt jeweils eine eigene Erklärung:',
        websiteHeading: 'Website hallovn.de',
    },
    en: {
        support: 'Support',
        privacy: 'Privacy',
        supportIntro: (name: string) => `Common questions and contact for ${name}.`,
        privacyTitle: 'Privacy policy',
        privacyIntro: (name: string) => `What data ${name} processes and what rights you have.`,
        faq: 'Common questions',
        contact: 'Contact',
        contactDesc: 'Did not find an answer? Write to us. We usually reply within 1–2 working days.',
        refund: 'Purchases & refunds',
        deletion: 'Data deletion',
        terms: 'Terms of use',
        all: 'All products',
        allPrivacy: 'All privacy policies',
        hubTitle: 'Support center',
        hubIntro: 'Choose your product to find answers, contact details and its privacy policy.',
        products: 'Products',
        hubFormTitle: 'General enquiry',
        topics: ['Data & privacy', 'Feedback', 'Partnership', 'Other'],
        websitePrivacy: 'Website privacy policy',
        websiteIntro: 'This page applies to the website hallovn.de. Each of our apps and services has its own policy:',
        websiteHeading: 'Website hallovn.de',
    },
    vi: {
        support: 'Hỗ trợ',
        privacy: 'Bảo mật',
        supportIntro: (name: string) => `Câu hỏi thường gặp và liên hệ về ${name}.`,
        privacyTitle: 'Chính sách bảo mật',
        privacyIntro: (name: string) => `${name} xử lý dữ liệu gì và bạn có những quyền nào.`,
        faq: 'Câu hỏi thường gặp',
        contact: 'Liên hệ',
        contactDesc: 'Chưa tìm thấy câu trả lời? Hãy viết cho chúng tôi. Chúng tôi thường trả lời trong 1–2 ngày làm việc.',
        refund: 'Mua hàng & hoàn tiền',
        deletion: 'Xoá dữ liệu',
        terms: 'Điều khoản sử dụng',
        all: 'Tất cả sản phẩm',
        allPrivacy: 'Tất cả chính sách bảo mật',
        hubTitle: 'Trung tâm hỗ trợ',
        hubIntro: 'Chọn sản phẩm của bạn để xem câu trả lời, liên hệ và chính sách bảo mật.',
        products: 'Sản phẩm',
        hubFormTitle: 'Yêu cầu chung',
        topics: ['Dữ liệu & bảo mật', 'Góp ý', 'Hợp tác', 'Khác'],
        websitePrivacy: 'Chính sách bảo mật của trang web',
        websiteIntro: 'Trang này áp dụng cho trang web hallovn.de. Mỗi ứng dụng và dịch vụ của chúng tôi có chính sách riêng:',
        websiteHeading: 'Trang web hallovn.de',
    },
};

function productNav(product: LegalProduct): LegalNavItem[] {
    const label = (key: 'support' | 'privacy' | 'refund' | 'terms' | 'deletion' | 'all') =>
        Object.fromEntries(LOCALES.map((l) => [l, COPY[l][key]])) as Record<Locale, string>;
    return [
        { href: `/${product.slug}/support`, icon: MailIcon, ...label('support') },
        { href: `/${product.slug}/privacy`, icon: LockIcon, ...label('privacy') },
        ...(product.hasPurchases
            ? [
                  { href: '/refund', icon: ReceiptIcon, ...label('refund') },
                  { href: '/terms', icon: DocumentIcon, ...label('terms') },
              ]
            : []),
        ...(product.showDeletion ? [{ href: '/delete-account', icon: TrashIcon, ...label('deletion') }] : []),
        { href: '/support', icon: BriefcaseIcon, ...label('all') },
    ];
}

const perLocaleOf = <T,>(build: (locale: Locale) => T) =>
    Object.fromEntries(LOCALES.map((l) => [l, build(l)])) as Record<Locale, T>;

function SupportBody({ product, locale }: { product: LegalProduct; locale: Locale }) {
    const t = COPY[locale];
    return (
        <>
            <section>
                <h2 id="faq" className="!mt-0 !border-0 !pt-0">{t.faq}</h2>
                <div className="divide-y divide-[var(--ink)]/20 border-y border-[var(--ink)]/20">
                    {product.faq[locale].map((item) => (
                        <details key={item.q} className="faq-item group">
                            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 font-semibold">
                                {item.q}
                                <PlusIcon className="faq-icon h-5 w-5 shrink-0 transition-transform" />
                            </summary>
                            <p className="pb-4">{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>
            <section>
                <h2 id="contact">{t.contact}</h2>
                <p>{t.contactDesc}</p>
                <p><a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></p>
                <SupportForm subject={product.name} />
            </section>
        </>
    );
}

export function ProductSupport({ slug }: { slug: string }) {
    const product = legalProduct(slug);
    return (
        <LegalShell
            title={perLocaleOf((l) => `${COPY[l].support}: ${product.name}`)}
            intro={perLocaleOf((l) => COPY[l].supportIntro(product.name))}
            content={perLocaleOf((l) => <SupportBody product={product} locale={l} />)}
            nav={productNav(product)}
            showUpdated={false}
        />
    );
}

export function ProductPrivacy({ slug }: { slug: string }) {
    const product = legalProduct(slug);
    return (
        <LegalShell
            title={perLocaleOf((l) => `${COPY[l].privacyTitle}: ${product.name}`)}
            intro={perLocaleOf((l) => COPY[l].privacyIntro(product.name))}
            content={perLocaleOf((l) => <LegalText sections={product.privacy[l]} />)}
            nav={productNav(product)}
        />
    );
}

/** Danh sách sản phẩm kèm liên kết support và bảo mật. */
function ProductList({ locale }: { locale: Locale }) {
    const t = COPY[locale];
    return (
        <ul className="!list-none !pl-0 border-t border-[var(--ink)]/20">
            {LEGAL_PRODUCTS.map((product) => (
                <li key={product.slug} className="!mb-0 grid gap-x-6 gap-y-1 border-b border-[var(--ink)]/20 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline">
                    <div>
                        <strong className="block font-display text-lg">{product.name}</strong>
                        <span className="text-[0.95rem]">{product.summary[locale]}</span>
                    </div>
                    <div className="flex gap-4 text-[0.95rem]">
                        <Link href={`/${product.slug}/support`}>{t.support}</Link>
                        <Link href={`/${product.slug}/privacy`}>{t.privacy}</Link>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function SupportHub() {
    const t = useT(COPY);
    return (
        <LegalShell
            title={perLocaleOf((l) => COPY[l].hubTitle)}
            intro={perLocaleOf((l) => COPY[l].hubIntro)}
            content={perLocaleOf((l) => (
                <>
                    <section>
                        <h2 id="products" className="!mt-0 !border-0 !pt-0">{COPY[l].products}</h2>
                        <ProductList locale={l} />
                    </section>
                    <section>
                        <h2 id="contact">{COPY[l].hubFormTitle}</h2>
                        <p>{COPY[l].contactDesc}</p>
                        <p><a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></p>
                        <SupportForm subjects={t.topics} />
                    </section>
                </>
            ))}
            showUpdated={false}
        />
    );
}

export function WebsitePrivacy() {
    return (
        <LegalShell
            title={perLocaleOf((l) => COPY[l].websitePrivacy)}
            intro={perLocaleOf((l) => COPY[l].websiteIntro)}
            content={perLocaleOf((l) => (
                <>
                    <section className="mb-10">
                        <h2 id="products" className="!mt-0 !border-0 !pt-0">{COPY[l].allPrivacy}</h2>
                        <ProductList locale={l} />
                    </section>
                    <h2 id="website" className="!mt-0 !border-0 !pt-0">{COPY[l].websiteHeading}</h2>
                    <LegalText sections={websitePrivacy[l]} />
                </>
            ))}
        />
    );
}
