'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import LegalShell from '@/components/company/LegalShell';
import type { LegalNavItem } from '@/components/company/LegalShell';
import LegalText from '@/components/company/LegalText';
import SupportForm from '@/components/company/SupportForm';
import type { SupportTopic } from '@/components/company/SupportForm';
import { LEGAL_PRODUCTS, legalProduct } from '@/lib/company/legal';
import { hallovnPrivacy } from '@/lib/company/legal/website';
import type { LegalProduct } from '@/lib/company/legal/types';
import { SITE } from '@/lib/company/site';
import type { Locale } from '@/components/company/LocaleContext';
import { ArrowRight, BadgeEuro, ChevronDown, CircleHelp, Cookie, FileText, KeyRound, LifeBuoy, Mail, Settings, ShieldCheck } from 'lucide-react';
import ConsentSettings from '@/components/company/ConsentSettings';

const LOCALES: Locale[] = ['de', 'en', 'vi'];
/** Slug kỹ thuật (giữ tên cũ) của sản phẩm chính HalloVN */
const HALLOVN_SLUG = 'shadowing';

const COPY = {
    de: {
        support: 'Support',
        privacy: 'Datenschutz',
        supportIntro: (name: string) => `Antworten auf häufige Fragen zu ${name} und der direkte Draht zu uns.`,
        privacyTitle: 'Datenschutzerklärung',
        privacyIntro: (name: string) => `Welche Daten ${name} verarbeitet und welche Rechte Sie haben.`,
        faq: 'Häufige Fragen',
        contact: 'Kontakt',
        contactDesc: 'Keine Antwort gefunden, einen Fehler entdeckt oder eine Idee? Schreiben Sie uns über das Formular oder per E-Mail. Wir lesen jede Nachricht und antworten in der Regel innerhalb weniger Werktage.',
        refund: 'Käufe & Erstattung',
        terms: 'Nutzungsbedingungen',
        all: 'Support-Center',
        hubTitle: 'Support-Center',
        hubIntro: 'Hilfe zu HalloVN – Deutschlernen, Vokabeln, Führerscheintheorie und Leben in Deutschland – und zu unseren weiteren Apps.',
        quick: 'Schnelle Hilfe',
        quickLinks: [
            { href: '/shadowing/support', label: 'Häufige Fragen zu HalloVN', desc: 'Konto, Gastzugang, Vokabelheft, Diamanten, Sprache und mehr' },
            { href: '/forgot-password', label: 'Passwort vergessen', desc: 'Code per E-Mail anfordern und neues Passwort setzen' },
            { href: '/settings', label: 'Kontoeinstellungen', desc: 'E-Mail, Passwort, Datenkopie und Konto löschen (nach Anmeldung)' },
            { href: '/shadowing/privacy', label: 'Datenschutz bei HalloVN', desc: 'Welche Daten gespeichert werden und Ihre Rechte' },
        ],
        products: 'Produkte',
        hubFormTitle: 'Nachricht an uns',
        websitePrivacy: 'Datenschutzerklärung',
        websiteIntro: 'Für die Website hallovn.de und die App HalloVN: welche Daten wir verarbeiten, wofür und welche Rechte Sie haben.',
        otherApps: 'Weitere Apps',
        otherAppsIntro: 'Für diese eigenständigen Apps gilt jeweils eine eigene Datenschutzerklärung:',
        consent: 'Datenschutz-Einstellungen',
    },
    en: {
        support: 'Support',
        privacy: 'Privacy',
        supportIntro: (name: string) => `Answers to common questions about ${name} and a direct line to us.`,
        privacyTitle: 'Privacy policy',
        privacyIntro: (name: string) => `What data ${name} processes and what rights you have.`,
        faq: 'Common questions',
        contact: 'Contact',
        contactDesc: 'No answer found, spotted a bug or have an idea? Write to us using the form or by email. We read every message and usually reply within a few working days.',
        refund: 'Purchases & refunds',
        terms: 'Terms of use',
        all: 'Support center',
        hubTitle: 'Support center',
        hubIntro: 'Help with HalloVN – learning German, vocabulary, driving theory and Leben in Deutschland – and with our other apps.',
        quick: 'Quick help',
        quickLinks: [
            { href: '/shadowing/support', label: 'HalloVN FAQ', desc: 'Account, guest access, vocabulary book, diamonds, language and more' },
            { href: '/forgot-password', label: 'Forgot password', desc: 'Get a code by email and set a new password' },
            { href: '/settings', label: 'Account settings', desc: 'Email, password, data copy and account deletion (after signing in)' },
            { href: '/shadowing/privacy', label: 'HalloVN privacy', desc: 'What data is stored and your rights' },
        ],
        products: 'Products',
        hubFormTitle: 'Message us',
        websitePrivacy: 'Privacy policy',
        websiteIntro: 'For the website hallovn.de and the HalloVN app: what data we process, why, and what rights you have.',
        otherApps: 'Other apps',
        otherAppsIntro: 'Each of these separate apps has its own privacy policy:',
        consent: 'Privacy settings',
    },
    vi: {
        support: 'Hỗ trợ',
        privacy: 'Bảo mật',
        supportIntro: (name: string) => `Giải đáp thắc mắc thường gặp về ${name} và cách liên hệ trực tiếp với chúng tôi.`,
        privacyTitle: 'Chính sách bảo mật',
        privacyIntro: (name: string) => `${name} xử lý dữ liệu gì và bạn có những quyền nào.`,
        faq: 'Câu hỏi thường gặp',
        contact: 'Liên hệ',
        contactDesc: 'Chưa tìm thấy câu trả lời, gặp lỗi hay có ý tưởng? Hãy viết cho chúng tôi qua biểu mẫu hoặc email. Chúng tôi đọc mọi tin nhắn và thường trả lời trong vài ngày làm việc.',
        refund: 'Mua hàng & hoàn tiền',
        terms: 'Điều khoản sử dụng',
        all: 'Trung tâm hỗ trợ',
        hubTitle: 'Trung tâm hỗ trợ',
        hubIntro: 'Hỗ trợ cho HalloVN – học tiếng Đức, từ vựng, ôn lý thuyết lái xe và Leben in Deutschland – cùng các ứng dụng khác của chúng tôi.',
        quick: 'Trợ giúp nhanh',
        quickLinks: [
            { href: '/shadowing/support', label: 'Câu hỏi thường gặp về HalloVN', desc: 'Tài khoản, học thử khi chưa đăng nhập, sổ từ, kim cương, ngôn ngữ…' },
            { href: '/forgot-password', label: 'Quên mật khẩu', desc: 'Nhận mã qua email và đặt mật khẩu mới' },
            { href: '/settings', label: 'Cài đặt tài khoản', desc: 'Email, mật khẩu, bản sao dữ liệu và xoá tài khoản (sau khi đăng nhập)' },
            { href: '/shadowing/privacy', label: 'Bảo mật tại HalloVN', desc: 'Dữ liệu nào được lưu và quyền của bạn' },
        ],
        products: 'Sản phẩm',
        hubFormTitle: 'Nhắn cho chúng tôi',
        websitePrivacy: 'Chính sách bảo mật',
        websiteIntro: 'Áp dụng cho trang web hallovn.de và ứng dụng HalloVN: chúng tôi xử lý dữ liệu gì, để làm gì và bạn có những quyền nào.',
        otherApps: 'Ứng dụng khác',
        otherAppsIntro: 'Mỗi ứng dụng độc lập sau có chính sách bảo mật riêng:',
        consent: 'Cài đặt quyền riêng tư',
    },
};

function productNav(product: LegalProduct): LegalNavItem[] {
    const label = (key: 'support' | 'privacy' | 'refund' | 'terms' | 'all') =>
        Object.fromEntries(LOCALES.map((l) => [l, COPY[l][key]])) as Record<Locale, string>;
    // Không còn liên kết /delete-account: đường dẫn đó thuộc 2 app đã tách (proxy chuyển sang ckk.biz).
    // Xoá tài khoản HalloVN nằm ở /settings (xem câu hỏi thường gặp).
    return [
        { href: `/${product.slug}/support`, icon: CircleHelp, ...label('support') },
        { href: `/${product.slug}/privacy`, icon: ShieldCheck, ...label('privacy') },
        ...(product.hasPurchases ? [{ href: '/refund', icon: BadgeEuro, ...label('refund') }] : []),
        ...(product.slug === HALLOVN_SLUG ? [{ href: '/terms', icon: FileText, ...label('terms') }] : []),
        { href: '/support', icon: LifeBuoy, ...label('all') },
    ];
}

const perLocaleOf = <T,>(build: (locale: Locale) => T) =>
    Object.fromEntries(LOCALES.map((l) => [l, build(l)])) as Record<Locale, T>;

/** Câu trả lời FAQ hỗ trợ [liên kết](/đường-dẫn); liên kết nội bộ dùng <Link> */
function faqInline(text: string): ReactNode[] {
    return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
        const link = part.match(/^\[(.+)\]\((.+)\)$/);
        if (!link) return part;
        if (link[2].startsWith('/')) return <Link key={i} href={link[2]}>{link[1]}</Link>;
        return <a key={i} href={link[2]} {...(/^https?:/.test(link[2]) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{link[1]}</a>;
    });
}

/** Chủ đề form: tài khoản và nội dung bài học chỉ có ở HalloVN (2 app nhỏ không có tài khoản) */
const topicsFor = (product: LegalProduct): SupportTopic[] =>
    product.slug === HALLOVN_SLUG ? ['account', 'bug', 'idea', 'content', 'privacy', 'other'] : ['bug', 'idea', 'privacy', 'other'];

/** Tiêu đề của một khung: icon nhỏ màu mực nhạt + chữ tiêu đề, như các mục trong /settings */
function CardTitle({ id, icon: Icon, children }: { id: string; icon: typeof Mail; children: ReactNode }) {
    return (
        <h2 id={id} className="section-title flex scroll-mt-24 items-center gap-2">
            <Icon className="size-5 shrink-0 text-muted" aria-hidden="true" /> {children}
        </h2>
    );
}

function ContactSection({ id, title, locale, product }: { id: string; title: string; locale: Locale; product?: LegalProduct }) {
    const t = COPY[locale];
    return (
        <section aria-labelledby={id} className="card flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-col gap-2">
                <CardTitle id={id} icon={Mail}>{title}</CardTitle>
                <p className="max-w-[65ch] text-sm text-muted">{t.contactDesc}</p>
                <a href={`mailto:${SITE.contactEmail}`} className="btn btn-sm max-w-full self-start break-all">
                    <Mail className="size-4 shrink-0 text-link" /> {SITE.contactEmail}
                </a>
            </div>
            <SupportForm product={product?.name} topics={product ? topicsFor(product) : undefined} />
        </section>
    );
}

/** Câu hỏi thường gặp: các dòng ngăn bằng đường kẻ (không lồng thẻ trong thẻ), mở ra thì câu hỏi in đậm hơn */
function FaqList({ items }: { items: { q: string; a: string }[] }) {
    return (
        <div className="flex flex-col divide-y divide-line border-y border-line dark:divide-border dark:border-border">
            {items.map((item) => (
                <details key={item.q} className="faq-item group">
                    <summary className="flex min-h-13 cursor-pointer items-center justify-between gap-3 rounded-ui py-3 font-semibold transition-colors hover:text-link focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent group-open:text-foreground">
                        {item.q}
                        <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-(--dur) group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                    </summary>
                    <p className="legal-links max-w-[70ch] pb-4 text-[0.95rem] leading-relaxed text-muted">{faqInline(item.a)}</p>
                </details>
            ))}
        </div>
    );
}

function SupportBody({ product, locale }: { product: LegalProduct; locale: Locale }) {
    const t = COPY[locale];
    return (
        <>
            <section aria-labelledby="faq" className="card flex flex-col gap-3 sm:p-6">
                <CardTitle id="faq" icon={CircleHelp}>{t.faq}</CardTitle>
                <FaqList items={product.faq[locale]} />
            </section>
            <ContactSection id="contact" title={t.contact} locale={locale} product={product} />
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
            badge={perLocaleOf((l) => COPY[l].support)}
            variant="cards"
        />
    );
}

/** Nút mở lại hộp đồng ý của Google, đặt ngay dưới mục quảng cáo (AdSense) của chính sách HalloVN */
const consentAfter = (locale: Locale) => ({
    ads: (
        <p>
            <ConsentSettings label={COPY[locale].consent} className="btn" icon={<Cookie className="size-4 text-muted" />} />
        </p>
    ),
});

export function ProductPrivacy({ slug }: { slug: string }) {
    const product = legalProduct(slug);
    return (
        <LegalShell
            title={perLocaleOf((l) => `${COPY[l].privacyTitle}: ${product.name}`)}
            intro={perLocaleOf((l) => COPY[l].privacyIntro(product.name))}
            content={perLocaleOf((l) => <LegalText sections={product.privacy[l]} after={slug === HALLOVN_SLUG ? consentAfter(l) : undefined} />)}
            nav={productNav(product)}
        />
    );
}

const QUICK_ICONS = [CircleHelp, KeyRound, Settings, ShieldCheck];
/** Màu ô icon của từng thẻ trợ giúp nhanh (cùng thứ tự QUICK_ICONS): xanh = trợ giúp, vàng = mật khẩu, xám = cài đặt, ngọc = quyền riêng tư */
const QUICK_TINTS = ['tint-link', 'tint-gold', 'tint-muted', 'tint-gem'];

export function SupportHub() {
    return (
        <LegalShell
            title={perLocaleOf((l) => COPY[l].hubTitle)}
            intro={perLocaleOf((l) => COPY[l].hubIntro)}
            badge={perLocaleOf((l) => COPY[l].support)}
            variant="cards"
            content={perLocaleOf((l) => (
                <>
                    <section aria-labelledby="quick" className="flex flex-col gap-3">
                        <CardTitle id="quick" icon={LifeBuoy}>{COPY[l].quick}</CardTitle>
                        {/* Trợ giúp nhanh: thẻ bấm được như ActionCard của Lái xe / LiD */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {COPY[l].quickLinks.map((item, i) => {
                                const Icon = QUICK_ICONS[i] ?? CircleHelp;
                                return (
                                    <Link key={item.href} href={item.href} className="group card card-link flex items-center gap-3 p-3 sm:p-4">
                                        <span className={`icon-bubble ${QUICK_TINTS[i] ?? 'tint-link'}`}>
                                            <Icon className="size-5" aria-hidden="true" />
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="font-semibold">{item.label}</span>
                                            <span className="text-sm text-muted">{item.desc}</span>
                                        </span>
                                        <ArrowRight className="size-4 shrink-0 text-link transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                    <section aria-labelledby="products" className="card flex flex-col gap-3 sm:p-6">
                        <CardTitle id="products" icon={FileText}>{COPY[l].products}</CardTitle>
                        <ul className="flex flex-col divide-y divide-line border-t border-line dark:divide-border dark:border-border">
                            {LEGAL_PRODUCTS.map((product) => (
                                <li key={product.slug} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <strong className="block font-display text-lg leading-snug font-bold">{product.name}</strong>
                                        <span className="text-sm text-muted">{product.summary[l]}</span>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <Link href={`/${product.slug}/support`} className="btn btn-sm">
                                            <CircleHelp className="size-4 text-muted" /> {COPY[l].support}
                                        </Link>
                                        <Link href={`/${product.slug}/privacy`} className="btn btn-sm">
                                            <ShieldCheck className="size-4 text-muted" /> {COPY[l].privacy}
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                    <ContactSection id="contact" title={COPY[l].hubFormTitle} locale={l} />
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
                    <LegalText sections={hallovnPrivacy[l]} after={consentAfter(l)} />
                    <section>
                        <h2 id="other-apps">{COPY[l].otherApps}</h2>
                        <p>{COPY[l].otherAppsIntro}</p>
                        <ul>
                            {LEGAL_PRODUCTS.filter((p) => p.slug !== HALLOVN_SLUG).map((p) => (
                                <li key={p.slug}>
                                    <Link href={`/${p.slug}/privacy`}>{p.name}</Link>: {p.summary[l]}
                                </li>
                            ))}
                        </ul>
                    </section>
                </>
            ))}
        />
    );
}
