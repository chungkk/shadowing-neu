'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { SERVICES, productPath } from '@/lib/company/services';
import type { ServiceId } from '@/lib/company/services';
import { PRODUCT_PAGES } from '@/lib/company/productPages';
import type { ProductPage } from '@/lib/company/productPages';
import { useLocale, useT } from '@/components/company/LocaleContext';
import { Shot, StartButton, inkText } from '@/components/company/ProductParts';
import { Lightbox } from '@/components/company/Lightbox';
import { ArrowRightIcon, PlusIcon } from '@/components/company/icons';

const UI = {
    de: {
        about: 'Über HalloVN',
        current: 'Lernplattform',
        support: 'Support',
        privacy: 'Datenschutz',
        facts: 'Auf einen Blick',
        galleryHint: 'Zum Vergrößern antippen',
        faq: 'Häufige Fragen',
        moreFaq: 'Mehr Antworten im Support',
        closing: 'Bereit zum Lernen?',
        moreTitle: 'Software nach Maß',
        moreText: 'Was hinter HalloVN steckt, bauen wir auch für Sie: Web-Anwendungen und Apps nach Ihren Anforderungen.',
        moreLink: 'Projekt anfragen',
    },
    en: {
        about: 'About HalloVN',
        current: 'Learning platform',
        support: 'Support',
        privacy: 'Privacy',
        facts: 'At a glance',
        galleryHint: 'Tap to enlarge',
        faq: 'Frequently asked questions',
        moreFaq: 'More answers in support',
        closing: 'Ready to start?',
        moreTitle: 'Custom software',
        moreText: 'What powers HalloVN, we also build for you: web applications and apps to your requirements.',
        moreLink: 'Start a project',
    },
    vi: {
        about: 'Về HalloVN',
        current: 'Nền tảng học',
        support: 'Hỗ trợ',
        privacy: 'Bảo mật',
        facts: 'Tóm tắt',
        galleryHint: 'Chạm vào ảnh để xem lớn',
        faq: 'Câu hỏi thường gặp',
        moreFaq: 'Xem thêm trong trang hỗ trợ',
        closing: 'Sẵn sàng học chưa?',
        moreTitle: 'Làm phần mềm theo yêu cầu',
        moreText: 'Công nghệ đứng sau HalloVN, chúng tôi cũng làm cho bạn: ứng dụng web và app theo yêu cầu.',
        moreLink: 'Gửi yêu cầu dự án',
    },
};

/** Ảnh của một mục: một ảnh, hoặc hai ảnh dọc so le nhau */
function SectionShots({ page, indexes, alts }: { page: ProductPage; indexes: number[]; alts: string[] }) {
    if (page.shape === 'landscape') {
        return <Shot screen={page.screens[indexes[0]]} alt={alts[indexes[0]]} sizes="(min-width: 1024px) 40rem, 100vw" />;
    }
    if (indexes.length === 1) {
        return <Shot screen={page.screens[indexes[0]]} alt={alts[indexes[0]]} sizes="16rem" className="mx-auto w-[15rem] md:w-[16rem]" />;
    }
    return (
        <div className="mx-auto flex max-w-[30rem] items-start gap-3 sm:gap-4">
            {indexes.map((n, i) => (
                <Shot key={n} screen={page.screens[n]} alt={alts[n]} sizes="15rem" className={`w-1/2 ${i === 1 ? 'mt-12' : ''}`} />
            ))}
        </div>
    );
}

export default function ProductPageView({ id }: { id: ServiceId }) {
    const { locale } = useLocale();
    const t = useT(UI);
    const service = SERVICES.find((s) => s.id === id)!;
    const page = PRODUCT_PAGES[id];
    const copy = page.copy[locale];
    const sc = service.copy[locale];
    const landscape = page.shape === 'landscape';
    const [viewing, setViewing] = useState<number | null>(null);
    const inkStyle = { '--stamp-ink': service.ink, '--band': service.ink, background: service.ink, color: inkText(service) } as CSSProperties;

    return (
        <>
            {/* Dải đầu trang bằng màu mực của sản phẩm */}
            <section aria-labelledby="product-title" className="on-ink overflow-x-clip" style={inkStyle}>
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-10 lg:grid-cols-12 lg:gap-14">
                    <div className={landscape ? 'lg:col-span-5' : 'lg:col-span-7'}>
                        <nav aria-label="Breadcrumb" className="text-sm font-semibold">
                            <Link href="/about" className="underline-offset-4 hover:underline">
                                {t.about}
                            </Link>
                            <span aria-hidden="true"> / </span>
                            <span aria-current="page">{t.current}</span>
                        </nav>
                        <h1 id="product-title" className="mt-6 font-display text-5xl font-bold leading-[0.98] tracking-tight text-balance md:text-7xl">
                            {service.name}
                        </h1>
                        <p className="mt-5 max-w-[34rem] text-xl leading-snug">{sc.tagline}</p>
                        <p className="mt-4 max-w-[36rem] leading-relaxed">{copy.intro}</p>
                        <div className="mt-8">
                            <StartButton service={service} />
                        </div>
                        <div className="mt-5 flex gap-4 text-sm font-semibold">
                            <Link href={`${productPath(service)}/support`} className="underline underline-offset-4">
                                {t.support}
                            </Link>
                            <Link href={`${productPath(service)}/privacy`} className="underline underline-offset-4">
                                {t.privacy}
                            </Link>
                        </div>
                    </div>
                    <div className={landscape ? 'lg:col-span-7' : 'lg:col-span-5'}>
                        {landscape ? (
                            <Shot screen={page.screens[page.hero[0]]} alt={copy.alts[page.hero[0]]} sizes="(min-width: 1024px) 40rem, 100vw" priority />
                        ) : (
                            <div className="mx-auto flex max-w-[28rem] items-start gap-3 sm:gap-4">
                                {page.hero.map((n, i) => (
                                    <Shot key={n} screen={page.screens[n]} alt={copy.alts[n]} sizes="14rem" priority className={`w-1/2 ${i === 1 ? 'mt-14' : ''}`} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Số liệu */}
            <section aria-label={t.facts} className="perf-top" style={{ '--band': 'var(--paper)' } as CSSProperties}>
                <div className="mx-auto max-w-6xl px-4 pb-4 pt-14 sm:px-6 md:pt-20">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                        {copy.facts.map((fact) => (
                            <div key={fact.label} className="min-w-0 border-t-4 pt-4" style={{ borderColor: service.ink }}>
                                <dt className="sr-only">{fact.label}</dt>
                                <dd className="font-display text-4xl font-bold leading-none tracking-tight tabular-nums break-words sm:text-5xl md:text-6xl">{fact.value}</dd>
                                <dd className="mt-3 max-w-[16rem] break-words text-[0.95rem] leading-snug text-[var(--ink)]/80 hyphens-auto">{fact.label}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* Từng phần học: mục có ảnh thật thì ảnh bên cạnh, mục chưa có ảnh thì chữ trải rộng */}
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                {copy.sections.map((section, i) => {
                    const flip = i % 2 === 1;
                    const shots = page.sections[i] ?? [];
                    const text = (
                        <>
                            <span aria-hidden="true" className="block h-3 w-6" style={{ background: service.ink }} />
                            <h2 id={`feature-${i}`} className="mt-5 font-display text-4xl font-bold leading-[1.02] tracking-tight text-balance md:text-5xl">
                                {section.title}
                            </h2>
                            <p className="mt-5 max-w-[34rem] text-lg leading-snug">{section.body}</p>
                        </>
                    );
                    const points = (
                        <ul className="mt-7 max-w-[36rem] border-t border-[var(--ink)]/20">
                            {section.points.map((point) => (
                                <li key={point} className="border-b border-[var(--ink)]/20 py-2.5">
                                    {point}
                                </li>
                            ))}
                        </ul>
                    );
                    const link = section.link && (
                        <Link href={section.link.href} className="group mt-6 inline-flex items-center gap-2 font-semibold text-[var(--ink-ultra)] underline-offset-4 hover:underline">
                            {section.link.label}
                            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    );
                    if (!shots.length) {
                        return (
                            <section
                                key={section.title}
                                aria-labelledby={`feature-${i}`}
                                className="grid gap-x-14 border-b border-[var(--ink)]/20 py-16 last:border-b-0 md:py-24 lg:grid-cols-12"
                            >
                                <div className="min-w-0 lg:col-span-6">
                                    {text}
                                    {link}
                                </div>
                                <div className="min-w-0 lg:col-span-6 lg:pt-8">{points}</div>
                            </section>
                        );
                    }
                    return (
                        <section
                            key={section.title}
                            aria-labelledby={`feature-${i}`}
                            className="grid items-center gap-10 border-b border-[var(--ink)]/20 py-16 last:border-b-0 md:py-24 lg:grid-cols-12 lg:gap-14"
                        >
                            <div className={`min-w-0 ${landscape ? 'lg:col-span-5' : 'lg:col-span-6'} ${flip ? 'lg:order-2' : ''}`}>
                                {text}
                                {points}
                                {link}
                            </div>
                            <div className={`${landscape ? 'lg:col-span-7' : 'lg:col-span-6'} ${flip ? 'lg:order-1' : ''}`}>
                                <SectionShots page={page} indexes={shots} alts={copy.alts} />
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Miễn phí và Premium: chỉ khi có thông tin đã xác nhận */}
            {copy.plans && (
                <section aria-labelledby="plans-title" className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="border-t border-[var(--ink)]/20 py-16 md:py-24">
                        <h2 id="plans-title" className="font-display text-4xl font-bold leading-[1.02] tracking-tight text-balance md:text-5xl">
                            {copy.plans.title}
                        </h2>
                        <p className="mt-5 max-w-[34rem] text-lg leading-snug">{copy.plans.intro}</p>
                        <div className="mt-10 grid gap-px bg-[var(--ink)]/20 md:grid-cols-2">
                            {copy.plans.columns.map((col, i) => (
                                <div key={col.title} className="bg-white p-6 md:p-8">
                                    <h3 className="flex items-center gap-3 font-display text-2xl font-bold">
                                        <span aria-hidden="true" className="h-3 w-6" style={{ background: i === 0 ? 'var(--paper)' : service.ink }} />
                                        {col.title}
                                    </h3>
                                    <ul className="mt-5 border-t border-[var(--ink)]/20">
                                        {col.items.map((item) => (
                                            <li key={item} className="border-b border-[var(--ink)]/20 py-2.5">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <p className="mt-5 max-w-[46rem] text-sm leading-relaxed text-[var(--ink)]/80">{copy.plans.note}</p>
                    </div>
                </section>
            )}

            {/* Toàn bộ ảnh chụp */}
            <section aria-labelledby="gallery-title">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="flex border-t border-[var(--ink)]/20 pt-16 md:pt-24 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                        <h2 id="gallery-title" className="font-display text-4xl font-bold leading-[1.02] tracking-tight text-balance md:text-5xl">
                            {copy.galleryTitle}
                        </h2>
                        <p className="text-sm text-[var(--ink)]/80">{t.galleryHint}</p>
                    </div>
                </div>
                <div
                    role="region"
                    aria-labelledby="gallery-title"
                    tabIndex={0}
                    className="mx-auto mt-8 flex max-w-[88rem] snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:px-6"
                >
                    {page.screens.map((screen, n) => (
                        <a
                            key={screen.src}
                            href={screen.src}
                            onClick={(e) => {
                                e.preventDefault();
                                setViewing(n);
                            }}
                            className={`shrink-0 snap-start cursor-zoom-in transition-transform hover:-translate-y-1 ${landscape ? 'w-[20rem] md:w-[30rem]' : 'w-[11rem] md:w-[13rem]'}`}
                        >
                            <Shot screen={screen} alt={copy.alts[n]} sizes={landscape ? '30rem' : '13rem'} />
                        </a>
                    ))}
                </div>
                {viewing !== null && (
                    <Lightbox screens={page.screens} alts={copy.alts} index={viewing} onIndex={(update) => setViewing((i) => (i === null ? null : update(i)))} onClose={() => setViewing(null)} />
                )}
            </section>

            {/* FAQ */}
            <section aria-labelledby="faq-title">
                <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <h2 id="faq-title" className="font-display text-4xl font-bold leading-[1.02] tracking-tight text-balance md:text-5xl">
                            {t.faq}
                        </h2>
                        <Link
                            href={`${productPath(service)}/support`}
                            className="mt-5 inline-flex items-center gap-2 font-semibold text-[var(--ink-ultra)] underline-offset-4 hover:underline"
                        >
                            {t.moreFaq}
                            <ArrowRightIcon className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="border-t border-[var(--ink)]/20 lg:col-span-8">
                        {copy.faq.map((item) => (
                            <details key={item.q} className="faq-item border-b border-[var(--ink)]/20">
                                <summary className="flex cursor-pointer items-start justify-between gap-6 py-4 font-display text-xl font-bold">
                                    {item.q}
                                    <PlusIcon className="faq-icon mt-1 h-5 w-5 shrink-0 transition-transform" />
                                </summary>
                                <p className="max-w-[44rem] pb-5 leading-relaxed">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Lời mời cuối trang */}
            <section aria-labelledby="closing-title" className="on-ink perf-top" style={inkStyle}>
                <div className="mx-auto grid max-w-6xl items-end gap-8 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-12">
                    <div className="lg:col-span-6">
                        <h2 id="closing-title" className="font-display text-5xl font-bold leading-[0.98] tracking-tight text-balance md:text-6xl">
                            {t.closing}
                        </h2>
                        <p className="mt-4 max-w-[30rem] text-lg leading-snug">{sc.tagline}</p>
                    </div>
                    <div className="lg:col-span-6">
                        <StartButton service={service} />
                    </div>
                </div>
            </section>

            {/* HalloVN cũng nhận làm phần mềm theo yêu cầu */}
            <section aria-labelledby="more-title" className="perf-top" style={{ '--band': 'var(--paper)' } as CSSProperties}>
                <div className="mx-auto grid max-w-6xl items-end gap-6 px-4 py-14 sm:px-6 md:grid-cols-12 md:py-20">
                    <div className="md:col-span-8">
                        <h2 id="more-title" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                            {t.moreTitle}
                        </h2>
                        <p className="mt-3 max-w-[36rem] text-lg leading-snug">{t.moreText}</p>
                    </div>
                    <div className="md:col-span-4 md:text-right">
                        <Link
                            href="/about#auftrag"
                            className="group inline-flex min-h-12 items-center gap-2 bg-[var(--ink-ultra)] px-5 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-[var(--ink)]"
                        >
                            {t.moreLink}
                            <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
