'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { COMPANY, SITE } from '@/biz/lib/site';
import { SERVICES, productPath } from '@/biz/lib/services';
import type { Service } from '@/biz/lib/services';
import { PRODUCT_PAGES } from '@/biz/lib/productPages';
import { useLocale, useT } from '@/biz/contexts/LocaleContext';
import { Shot, StoreButtons, inkText } from '@/biz/components/business/ProductParts';
import ProjectForm from '@/biz/components/business/ProjectForm';
import { Postmark, StampArt } from '@/biz/components/business/StampArt';
import { ArrowRightIcon } from '@/biz/components/icons';

const COPY = {
    de: {
        h1a: 'Wir bauen Software.',
        h1b: 'Und betreiben sie selbst.',
        lead: 'CKK entwickelt eigene Apps und Web-Anwendungen. Und auf Anfrage auch Ihre.',
        cta: 'Projekt anfragen',
        no: 'Nr.',
        projectStamp: 'Ihr Projekt?',
        projectShort: 'App oder Web-Anwendung nach Ihren Anforderungen',
        sheetNote: 'Weitere Produkte folgen',
        projectTitle: 'Wir bauen auch Ihre Software.',
        projectDesc: 'Was wir für unsere eigenen Produkte gebaut haben und täglich betreiben, bauen wir auch für Sie.',
        proof: [
            { title: 'Apps für iPhone und iPad', from: 'Führerschein Theorie Ckk, Leben in Deutschland Ckk' },
            { title: 'Web-Anwendungen mit Nutzerkonten', from: 'Deutsch Shadowing' },
            { title: 'Schnittstellen und Backend', from: 'Die Inhalte und Updates unserer Apps' },
            { title: 'Mehrsprachige Inhalte', from: 'Übersetzungen in bis zu 5 Sprachen' },
        ],
        contactTitle: 'Kontakt',
        contactDesc: 'Support, Kooperation oder Presse: Wir melden uns in der Regel innerhalb von 1–2 Werktagen.',
        support: 'Support',
        privacy: 'Datenschutz',
        details: 'Alles über die App',
        detailsWeb: 'Mehr über Deutsch Shadowing',
        supportCenter: 'Zum Support-Center',
    },
    en: {
        h1a: 'We build software.',
        h1b: 'And run it ourselves.',
        lead: 'CKK develops its own apps and web applications. And, on request, yours too.',
        cta: 'Start a project',
        no: 'No.',
        projectStamp: 'Your project?',
        projectShort: 'An app or web application built to your requirements',
        sheetNote: 'More products to come',
        projectTitle: 'We build your software too.',
        projectDesc: 'What we built for our own products and run every day, we also build for you.',
        proof: [
            { title: 'Apps for iPhone and iPad', from: 'Führerschein Theorie Ckk, Leben in Deutschland Ckk' },
            { title: 'Web applications with user accounts', from: 'Deutsch Shadowing' },
            { title: 'APIs and backend', from: 'The content and updates of our apps' },
            { title: 'Multilingual content', from: 'Translations into up to 5 languages' },
        ],
        contactTitle: 'Contact',
        contactDesc: 'Support, partnerships or press: we usually reply within 1–2 working days.',
        support: 'Support',
        privacy: 'Privacy',
        details: 'Everything about the app',
        detailsWeb: 'More about Deutsch Shadowing',
        supportCenter: 'Go to the support center',
    },
    vi: {
        h1a: 'Chúng tôi làm phần mềm.',
        h1b: 'Và tự vận hành nó.',
        lead: 'CKK phát triển các app và ứng dụng web của riêng mình, và nhận làm cho bạn theo yêu cầu.',
        cta: 'Gửi yêu cầu dự án',
        no: 'Số',
        projectStamp: 'Dự án của bạn?',
        projectShort: 'App hoặc ứng dụng web theo yêu cầu của bạn',
        sheetNote: 'Sắp có thêm sản phẩm',
        projectTitle: 'Chúng tôi cũng làm phần mềm cho bạn.',
        projectDesc: 'Những gì chúng tôi đã xây và vận hành hằng ngày cho sản phẩm của mình, chúng tôi cũng làm được cho bạn.',
        proof: [
            { title: 'App cho iPhone và iPad', from: 'Führerschein Theorie Ckk, Leben in Deutschland Ckk' },
            { title: 'Ứng dụng web có tài khoản người dùng', from: 'Deutsch Shadowing' },
            { title: 'API và backend', from: 'Nội dung và cập nhật của các app' },
            { title: 'Nội dung đa ngôn ngữ', from: 'Bản dịch tối đa 5 ngôn ngữ' },
        ],
        contactTitle: 'Liên hệ',
        contactDesc: 'Hỗ trợ, hợp tác hoặc báo chí: chúng tôi thường trả lời trong 1–2 ngày làm việc.',
        support: 'Hỗ trợ',
        privacy: 'Bảo mật',
        details: 'Xem chi tiết về app',
        detailsWeb: 'Xem chi tiết Deutsch Shadowing',
        supportCenter: 'Đến trung tâm hỗ trợ',
    },
};

/** Một con tem trên tờ: dẫn tới mục riêng của sản phẩm */
function Stamp({ service, index }: { service: Service; index: number }) {
    const { locale } = useLocale();
    const t = useT(COPY);
    return (
        <Link href={productPath(service)} className="stamp perf flex min-h-[19rem] p-2.5 md:p-3 xl:min-h-[27rem]">
            <span className="stamp-face flex w-full flex-col p-3 md:p-4" style={{ '--stamp-ink': service.ink, '--i': index, background: service.ink, color: inkText(service) } as CSSProperties}>
                <span className="flex items-baseline justify-between text-sm font-semibold">
                    <span>CKK</span>
                    <span className="tabular-nums">
                        {t.no} {service.no}
                    </span>
                </span>
                <StampArt id={service.id} className="my-3 min-h-0 w-full flex-1 md:my-4" />
                <span className="font-display text-xl font-bold leading-[1.05] tracking-tight text-balance md:text-[1.7rem]">{service.name}</span>
                <span className="mt-2 text-[0.82rem] leading-snug md:text-sm">{service.copy[locale].short}</span>
            </span>
            <Postmark center={service.platform} className="postmark pointer-events-none absolute -right-1 bottom-16 w-28 md:w-32" />
        </Link>
    );
}

/** Mục riêng của từng sản phẩm */
function ServiceBand({ service, index }: { service: Service; index: number }) {
    const { locale } = useLocale();
    const t = useT(COPY);
    const copy = service.copy[locale];
    const page = PRODUCT_PAGES[service.id];
    const flip = index % 2 === 1;
    return (
        <section id={service.id} aria-labelledby={`${service.id}-title`} className="on-ink perf-top scroll-mt-16" style={{ '--stamp-ink': service.ink, '--band': service.ink, color: inkText(service) } as CSSProperties}>
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12 lg:gap-14">
                <div className={`lg:col-span-7 ${flip ? 'lg:order-2' : ''}`}>
                    <h2 id={`${service.id}-title`} className="font-display text-5xl font-bold leading-[0.98] tracking-tight text-balance md:text-7xl">
                        {service.name}
                    </h2>
                    <p className="mt-5 max-w-[34rem] text-xl leading-snug">{copy.tagline}</p>
                    <ul className="mt-8 max-w-[38rem] border-t border-current/35">
                        {copy.features.map((feature) => (
                            <li key={feature} className="border-b border-current/35 py-2.5">
                                {feature}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-8">
                        <StoreButtons service={service} />
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold">
                        <Link href={productPath(service)} className="group inline-flex items-center gap-2 font-display text-lg font-bold underline underline-offset-4">
                            {service.platform === 'Web' ? t.detailsWeb : t.details}
                            <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link href={`${productPath(service)}/support`} className="underline underline-offset-4">{t.support}</Link>
                        <Link href={`${productPath(service)}/privacy`} className="underline underline-offset-4">{t.privacy}</Link>
                    </div>
                </div>
                <div className={`lg:col-span-5 ${flip ? 'lg:order-1' : ''}`}>
                    {page.shape === 'landscape' ? (
                        <Shot screen={page.screens[page.hero[0]]} alt={page.copy[locale].alts[page.hero[0]]} sizes="(min-width: 1024px) 28rem, 100vw" />
                    ) : (
                        <div className="mx-auto flex max-w-[26rem] items-start gap-3 sm:gap-4">
                            {page.hero.map((n, i) => (
                                <Shot key={n} screen={page.screens[n]} alt={page.copy[locale].alts[n]} sizes="13rem" className={`w-1/2 ${i === 1 ? 'mt-12' : ''}`} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default function HomeContent() {
    const t = useT(COPY);
    return (
        <>
            <section id="apps" aria-labelledby="home-title" className="scroll-mt-16 overflow-x-clip">
                <div className="mx-auto max-w-[88rem] px-4 pb-6 pt-8 sm:px-6 md:pt-10">
                    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
                        <h1 id="home-title" className="font-display text-[clamp(2.75rem,5.2vw,6rem)] font-bold leading-[0.96] tracking-[-0.035em] lg:col-span-9">
                            <span className="block">{t.h1a}</span>
                            <span className="block text-[var(--ink-ultra)]">{t.h1b}</span>
                        </h1>
                        <div className="lg:col-span-3 lg:pb-2">
                            <p className="max-w-[26rem] text-lg leading-snug">{t.lead}</p>
                            <a
                                href="#auftrag"
                                className="mt-4 inline-flex min-h-12 items-center gap-2 bg-[var(--ink-ultra)] px-5 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-[var(--ink)]"
                            >
                                {t.cta}
                                <ArrowRightIcon className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    <div className="mt-7 grid grid-cols-2 lg:grid-cols-4">
                        {SERVICES.map((service, i) => (
                            <Stamp key={service.id} service={service} index={i} />
                        ))}
                        <a href="#auftrag" className="stamp perf flex min-h-[19rem] p-2.5 md:p-3 xl:min-h-[27rem]">
                            <span
                                className="stamp-face flex w-full flex-col border-2 border-dashed border-[var(--ink-ultra)] p-3 text-[var(--ink-ultra)] md:p-4"
                                style={{ '--i': SERVICES.length } as CSSProperties}
                            >
                                <span className="flex items-baseline justify-between text-sm font-semibold">
                                    <span>CKK</span>
                                    <span>{t.no} …</span>
                                </span>
                                <span className="flex-1" />
                                <span className="font-display text-3xl font-bold leading-[1.02] tracking-tight text-balance md:text-5xl">{t.projectStamp}</span>
                                <span className="mt-2 text-[0.82rem] leading-snug md:text-sm">{t.projectShort}</span>
                            </span>
                        </a>
                    </div>

                    {/* Lề tờ tem: dải màu kiểm tra in, mỗi ô là một màu mực đang dùng */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
                        <span aria-hidden="true" className="flex">
                            {SERVICES.map((service) => (
                                <span key={service.id} className="h-3 w-6" style={{ background: service.ink }} />
                            ))}
                            <span className="h-3 w-6 bg-[var(--ink-ultra)]" />
                        </span>
                        <span>{t.sheetNote}</span>
                    </div>
                </div>
            </section>

            <div className="pt-8">
                {SERVICES.map((service, i) => (
                    <ServiceBand key={service.id} service={service} index={i} />
                ))}

                <section id="auftrag" aria-labelledby="auftrag-title" className="on-ink perf-top scroll-mt-16 text-white" style={{ '--band': 'var(--ink-ultra)' } as CSSProperties}>
                    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 id="auftrag-title" className="font-display text-5xl font-bold leading-[0.98] tracking-tight text-balance md:text-7xl">
                                {t.projectTitle}
                            </h2>
                            <p className="mt-5 max-w-[34rem] text-xl leading-snug">{t.projectDesc}</p>
                            <ul className="mt-8 max-w-[38rem] border-t border-white/40">
                                {t.proof.map((item) => (
                                    <li key={item.title} className="border-b border-white/40 py-3">
                                        <span className="block font-display text-xl font-bold">{item.title}</span>
                                        <span className="mt-0.5 block text-[0.95rem]">{item.from}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="lg:col-span-5">
                            <div className="perf p-6 md:p-8">
                                <ProjectForm />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <section id="contact" aria-labelledby="contact-title" className="perf-top scroll-mt-16" style={{ '--band': 'var(--paper)' } as CSSProperties}>
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-12 md:py-20">
                    <div className="md:col-span-7">
                        <h2 id="contact-title" className="font-display text-5xl font-bold tracking-tight md:text-7xl">
                            {t.contactTitle}
                        </h2>
                        <p className="mt-4 max-w-[34rem] text-lg leading-snug">{t.contactDesc}</p>
                    </div>
                    <div className="self-end md:col-span-5">
                        <a href={`mailto:${SITE.contactEmail}`} className="font-display text-2xl font-bold text-[var(--ink-ultra)] underline underline-offset-4 md:text-3xl">
                            {SITE.contactEmail}
                        </a>
                        <Link href="/support" className="mt-3 flex items-center gap-2 font-semibold hover:text-[var(--ink-ultra)]">
                            {t.supportCenter}
                            <ArrowRightIcon className="h-4 w-4" />
                        </Link>
                        <p className="mt-3 text-[0.95rem]">{COMPANY.postalCity}</p>
                    </div>
                </div>
            </section>
        </>
    );
}
