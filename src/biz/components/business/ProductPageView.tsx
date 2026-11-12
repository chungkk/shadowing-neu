'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { SERVICES, productPath } from '@/biz/lib/services';
import type { ServiceId } from '@/biz/lib/services';
import { PRODUCT_PAGES } from '@/biz/lib/productPages';
import type { ProductPage } from '@/biz/lib/productPages';
import { useLocale, useT } from '@/biz/contexts/LocaleContext';
import { Shot, StoreButtons, inkText } from '@/biz/components/business/ProductParts';
import { StampArt } from '@/biz/components/business/StampArt';
import { Lightbox } from '@/biz/components/business/Lightbox';
import { ArrowRightIcon, PlusIcon } from '@/biz/components/icons';

const UI = {
    de: {
        products: 'Produkte',
        support: 'Support',
        privacy: 'Datenschutz',
        facts: 'Auf einen Blick',
        galleryHint: 'Zum Vergrößern antippen',
        faq: 'Häufige Fragen',
        moreFaq: 'Mehr Antworten im Support',
        closing: 'Bereit zum Lernen?',
        more: 'Weitere Produkte von CKK',
        no: 'Nr.',
    },
    en: {
        products: 'Products',
        support: 'Support',
        privacy: 'Privacy',
        facts: 'At a glance',
        galleryHint: 'Tap to enlarge',
        faq: 'Frequently asked questions',
        moreFaq: 'More answers in support',
        closing: 'Ready to start?',
        more: 'More products from CKK',
        no: 'No.',
    },
    vi: {
        products: 'Sản phẩm',
        support: 'Hỗ trợ',
        privacy: 'Bảo mật',
        facts: 'Tóm tắt',
        galleryHint: 'Chạm vào ảnh để xem lớn',
        faq: 'Câu hỏi thường gặp',
        moreFaq: 'Xem thêm trong trang hỗ trợ',
        closing: 'Sẵn sàng học chưa?',
        more: 'Sản phẩm khác của CKK',
        no: 'Số',
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
    const others = SERVICES.filter((s) => s.id !== id);
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
                                CKK
                            </Link>
                            <span aria-hidden="true"> / </span>
                            <Link href="/about#apps" className="underline-offset-4 hover:underline">
                                {t.products}
                            </Link>
                        </nav>
                        <h1 id="product-title" className="mt-6 font-display text-5xl font-bold leading-[0.98] tracking-tight text-balance md:text-7xl">
                            {service.name}
                        </h1>
                        <p className="mt-5 max-w-[34rem] text-xl leading-snug">{sc.tagline}</p>
                        <p className="mt-4 max-w-[36rem] leading-relaxed">{copy.intro}</p>
                        <div className="mt-8">
                            <StoreButtons service={service} />
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

            {/* Từng tính năng, mỗi mục gắn với ảnh thật */}
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                {copy.sections.map((section, i) => {
                    const flip = i % 2 === 1;
                    return (
                        <section
                            key={section.title}
                            aria-labelledby={`feature-${i}`}
                            className="grid items-center gap-10 border-b border-[var(--ink)]/20 py-16 last:border-b-0 md:py-24 lg:grid-cols-12 lg:gap-14"
                        >
                            <div className={`min-w-0 ${landscape ? 'lg:col-span-5' : 'lg:col-span-6'} ${flip ? 'lg:order-2' : ''}`}>
                                <span aria-hidden="true" className="block h-3 w-6" style={{ background: service.ink }} />
                                <h2 id={`feature-${i}`} className="mt-5 font-display text-4xl font-bold leading-[1.02] tracking-tight text-balance md:text-5xl">
                                    {section.title}
                                </h2>
                                <p className="mt-5 max-w-[34rem] text-lg leading-snug">{section.body}</p>
                                <ul className="mt-7 max-w-[36rem] border-t border-[var(--ink)]/20">
                                    {section.points.map((point) => (
                                        <li key={point} className="border-b border-[var(--ink)]/20 py-2.5">
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className={`${landscape ? 'lg:col-span-7' : 'lg:col-span-6'} ${flip ? 'lg:order-1' : ''}`}>
                                <SectionShots page={page} indexes={page.sections[i]} alts={copy.alts} />
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
                        <h2 id="gallery-title" className="font-display text-4xl font-bold tracking-tight md:text-5xl">
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
                        <StoreButtons service={service} />
                    </div>
                </div>
            </section>

            {/* Sản phẩm khác */}
            <section aria-labelledby="more-title" className="perf-top" style={{ '--band': 'var(--paper)' } as CSSProperties}>
                <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
                    <h2 id="more-title" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                        {t.more}
                    </h2>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {others.map((other) => (
                            <Link key={other.id} href={productPath(other)} className="perf group flex p-2.5">
                                <span
                                    className="flex w-full items-center gap-4 p-4"
                                    style={{ '--stamp-ink': other.ink, background: other.ink, color: inkText(other) } as CSSProperties}
                                >
                                    <StampArt id={other.id} className="hidden h-16 w-20 shrink-0 min-[400px]:block" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold tabular-nums">
                                            CKK · {t.no} {other.no}
                                        </span>
                                        <span className="mt-1 block break-words font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">{other.name}</span>
                                        <span className="mt-1 block text-sm leading-snug">{other.copy[locale].short}</span>
                                    </span>
                                    <ArrowRightIcon className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1" />
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
