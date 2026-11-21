'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Check, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import { SERVICES, productPath } from '@/lib/company/services';
import type { ServiceId } from '@/lib/company/services';
import { PRODUCT_PAGES } from '@/lib/company/productPages';
import type { PageSection, ProductPage } from '@/lib/company/productPages';
import { useLocale, useT } from '@/components/company/LocaleContext';
import { Shot, StartButton, moreLink } from '@/components/company/ProductParts';
import { Lightbox } from '@/components/company/Lightbox';
import PageHeader from '@/components/PageHeader';

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
        return <Shot screen={page.screens[indexes[0]]} alt={alts[indexes[0]]} sizes="(min-width: 1024px) 36rem, 100vw" />;
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

/** Tiêu đề khối, như "HalloVN có gì?" trên trang chủ app */
function SectionHead({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h2 id={id} className="section-title text-2xl text-balance sm:text-3xl">
                {title}
            </h2>
            {children}
        </div>
    );
}

/** Nội dung chữ của một mục tính năng: số thứ tự, tiêu đề, mô tả, các ý, link tới phần học */
function FeatureText({ section, i }: { section: PageSection; i: number }) {
    return (
        <div className="flex min-w-0 flex-col gap-3">
            <span className="flex items-baseline gap-3">
                <span className="font-display text-3xl leading-none font-extrabold tracking-[-0.04em] text-sec-text tabular-nums" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                </span>
                <h2 id={`feature-${i}`} className="section-title text-balance">
                    {section.title}
                </h2>
            </span>
            <p className="text-muted">{section.body}</p>
            <ul className="flex flex-col gap-1.5 text-sm">
                {section.points.map((point) => (
                    <li key={point} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-ok-text" /> {point}
                    </li>
                ))}
            </ul>
            {section.link && (
                <Link href={section.link.href} className={`group ${moreLink}`}>
                    {section.link.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </Link>
            )}
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
    // Mục có ảnh: thẻ rộng, ảnh so le trái/phải. Mục chỉ có chữ: xếp thành lưới thẻ bên dưới.
    const withShots = copy.sections.map((section, i) => ({ section, i, shots: page.sections[i] ?? [] }));
    const shotSections = withShots.filter((s) => s.shots.length);
    const textSections = withShots.filter((s) => !s.shots.length);

    return (
        <div className="page gap-10 md:gap-14">
            <nav aria-label="Breadcrumb" className="-mb-2 flex items-center gap-1 text-sm font-semibold text-muted md:-mb-4">
                <Link href="/about" className="inline-flex min-h-11 items-center hover:text-foreground hover:underline">
                    {t.about}
                </Link>
                <ChevronRight className="size-4" aria-hidden="true" />
                <span aria-current="page" className="text-foreground">
                    {t.current}
                </span>
            </nav>

            {/* Đầu trang chữ ký: bìa xanh (khu học) + nhãn vở có linh vật */}
            <PageHeader
                sec="de"
                icon={GraduationCap}
                mascot
                title={<span id="product-title">{service.name}</span>}
                sub={sc.tagline}
                actions={
                    <>
                        <Link href={`${productPath(service)}/support`} className="btn btn-sm">
                            {t.support}
                        </Link>
                        <Link href={`${productPath(service)}/privacy`} className="btn btn-sm">
                            {t.privacy}
                        </Link>
                    </>
                }
            />

            {/* Mở đầu: lời giới thiệu + nút bắt đầu, ảnh chụp thật bên cạnh */}
            <section aria-labelledby="product-title" className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
                <div className="flex min-w-0 flex-col gap-5">
                    <p className="lead">{copy.intro}</p>
                    <StartButton service={service} />
                </div>
                {landscape ? (
                    <Shot screen={page.screens[page.hero[0]]} alt={copy.alts[page.hero[0]]} sizes="(min-width: 1024px) 34rem, 100vw" priority />
                ) : (
                    <div className="mx-auto flex max-w-[28rem] items-start gap-3 sm:gap-4">
                        {page.hero.map((n, i) => (
                            <Shot key={n} screen={page.screens[n]} alt={copy.alts[n]} sizes="14rem" priority className={`w-1/2 ${i === 1 ? 'mt-14' : ''}`} />
                        ))}
                    </div>
                )}
            </section>

            {/* Số liệu: một dải chia cột như dải "obi" trên trang chủ app */}
            <section aria-label={t.facts}>
                <dl className="card grid grid-cols-2 gap-y-5 p-0 py-5 lg:grid-cols-4">
                    {copy.facts.map((fact, n) => (
                        <div key={fact.label} className={`flex min-w-0 flex-col-reverse gap-1.5 px-4 sm:px-6 ${n % 2 ? 'border-l border-line dark:border-border' : ''} ${n > 0 ? 'lg:border-l lg:border-line lg:dark:border-border' : ''}`}>
                            <dt className="text-sm text-muted hyphens-auto">{fact.label}</dt>
                            <dd className="font-display text-3xl leading-none font-extrabold tracking-[-0.03em] tabular-nums">{fact.value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Từng phần học */}
            {shotSections.map(({ section, i, shots }, k) => (
                <section key={section.title} data-sec="de" aria-labelledby={`feature-${i}`} className="card grid items-center gap-6 p-5 sm:p-6 lg:grid-cols-2 lg:gap-8">
                    <div className={k % 2 ? 'lg:order-2' : ''}>
                        <FeatureText section={section} i={i} />
                    </div>
                    <div className={`min-w-0 ${k % 2 ? 'lg:order-1' : ''}`}>
                        <SectionShots page={page} indexes={shots} alts={copy.alts} />
                    </div>
                </section>
            ))}
            {textSections.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {textSections.map(({ section, i }) => (
                        <section key={section.title} data-sec="de" aria-labelledby={`feature-${i}`} className="card p-5 sm:p-6">
                            <FeatureText section={section} i={i} />
                        </section>
                    ))}
                </div>
            )}

            {/* Miễn phí và Premium: chỉ khi có thông tin đã xác nhận */}
            {copy.plans && (
                <section aria-labelledby="plans-title" className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h2 id="plans-title" className="section-title text-2xl text-balance sm:text-3xl">
                            {copy.plans.title}
                        </h2>
                        <p className="max-w-3xl text-muted">{copy.plans.intro}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {copy.plans.columns.map((col, i) => (
                            <div key={col.title} className={`card flex flex-col gap-3 p-5 ${i ? 'border-accent/35 bg-accent-soft' : ''}`}>
                                <h3 className="flex items-center gap-2 font-display text-xl font-bold">
                                    <BadgeCheck className={`size-6 ${i ? 'text-accent-text' : 'text-muted'}`} /> {col.title}
                                </h3>
                                <ul className="flex flex-col gap-1.5 text-sm">
                                    {col.items.map((item) => (
                                        <li key={item} className="flex gap-2">
                                            <Check className="mt-0.5 size-4 shrink-0 text-ok-text" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted">{copy.plans.note}</p>
                </section>
            )}

            {/* Toàn bộ ảnh chụp: hàng cuộn ngang, bấm để xem lớn */}
            <section aria-labelledby="gallery-title" className="flex min-w-0 flex-col gap-4">
                <SectionHead id="gallery-title" title={copy.galleryTitle}>
                    <p className="text-sm text-muted">{t.galleryHint}</p>
                </SectionHead>
                <div role="region" aria-labelledby="gallery-title" tabIndex={0} className="scroll-row -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 px-4 pt-2 pb-3 md:mx-0 md:scroll-px-0 md:px-0">
                    {page.screens.map((screen, n) => (
                        <a
                            key={screen.src}
                            href={screen.src}
                            onClick={(e) => {
                                e.preventDefault();
                                setViewing(n);
                            }}
                            className={`snap-start cursor-zoom-in rounded-panel transition-transform duration-(--dur) ease-(--ease-out) hover:-translate-y-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${landscape ? 'w-[18rem] md:w-[26rem]' : 'w-[11rem] md:w-[13rem]'}`}
                        >
                            <Shot screen={screen} alt={copy.alts[n]} sizes={landscape ? '26rem' : '13rem'} />
                        </a>
                    ))}
                </div>
                {viewing !== null && (
                    <Lightbox screens={page.screens} alts={copy.alts} index={viewing} onIndex={(update) => setViewing((i) => (i === null ? null : update(i)))} onClose={() => setViewing(null)} />
                )}
            </section>

            {/* Câu hỏi thường gặp: cùng khuôn với trang Lái xe / LiD */}
            <section className="card flex flex-col gap-3 p-4 sm:p-6" aria-labelledby="faq-title">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <h2 id="faq-title" className="section-title">
                        {t.faq}
                    </h2>
                    <Link href={`${productPath(service)}/support`} className={`group ${moreLink}`}>
                        {t.moreFaq} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                    </Link>
                </div>
                <div className="flex flex-col divide-y divide-line border-y border-line dark:divide-border dark:border-border">
                    {copy.faq.map((item) => (
                        <details key={item.q} className="faq-item group">
                            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-ui py-3 font-semibold transition-colors hover:text-link focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent group-open:text-foreground">
                                {item.q}
                                <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-(--dur) group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                            </summary>
                            <p className="max-w-[70ch] pb-4 text-[0.95rem] leading-relaxed text-muted">{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section aria-labelledby="closing-title" className="card flex flex-col items-start gap-4 p-6 sm:p-8">
                <h2 id="closing-title" className="font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.4rem)] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance">
                    {t.closing}
                </h2>
                <p className="lead max-w-xl">{sc.tagline}</p>
                <StartButton service={service} />
            </section>

            {/* HalloVN cũng nhận làm phần mềm theo yêu cầu */}
            <section aria-labelledby="more-title">
                <Link href="/about#auftrag" className="group card card-link flex flex-col gap-2 p-5 sm:p-6 motion-reduce:hover:translate-y-0">
                    <BriefcaseBusiness className="size-7 text-muted" strokeWidth={2} aria-hidden="true" />
                    <h2 id="more-title" className="section-title">
                        {t.moreTitle}
                    </h2>
                    <p className="text-muted">{t.moreText}</p>
                    <span className={moreLink}>
                        {t.moreLink} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                    </span>
                </Link>
            </section>
        </div>
    );
}
