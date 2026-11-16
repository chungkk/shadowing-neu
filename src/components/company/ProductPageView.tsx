'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { SERVICES, productPath } from '@/lib/company/services';
import type { ServiceId } from '@/lib/company/services';
import { PRODUCT_PAGES } from '@/lib/company/productPages';
import type { PageSection, ProductPage } from '@/lib/company/productPages';
import { useLocale, useT } from '@/components/company/LocaleContext';
import { Shot, StartButton, moreLink } from '@/components/company/ProductParts';
import { Lightbox } from '@/components/company/Lightbox';
import Mascot from '@/components/Mascot';

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
            <span className="flex items-center gap-3">
                <span className="icon-bubble tint-accent rounded-full font-display text-lg font-extrabold">{i + 1}</span>
                <h2 id={`feature-${i}`} className="text-xl leading-snug font-extrabold text-balance sm:text-2xl">
                    {section.title}
                </h2>
            </span>
            <p className="text-muted">{section.body}</p>
            <ul className="flex flex-col gap-1.5 text-sm">
                {section.points.map((point) => (
                    <li key={point} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent-text" /> {point}
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
            {/* Đầu trang: thẻ .hero (nền gradient nhạt) + linh vật + nhãn vàng, ảnh chụp bên cạnh */}
            <section aria-labelledby="product-title" className="sticker hero rise-in grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:gap-8">
                <div className="flex min-w-0 flex-col gap-4">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm font-bold text-muted">
                        <Link href="/about" className="hover:text-foreground hover:underline">
                            {t.about}
                        </Link>
                        <ChevronRight className="size-4" aria-hidden="true" />
                        <span aria-current="page" className="text-foreground">
                            {t.current}
                        </span>
                    </nav>
                    <div className="flex items-center gap-3 sm:gap-5">
                        <Mascot animated className="bob size-20 sm:size-28" />
                        <div className="flex min-w-0 flex-col items-start gap-1.5">
                            <span className="badge badge-gold text-sm">{t.current}</span>
                            <h1 id="product-title" className="display">
                                {service.name}
                            </h1>
                        </div>
                    </div>
                    <p className="text-lg font-bold text-balance">{sc.tagline}</p>
                    <p className="lead">{copy.intro}</p>
                    <StartButton service={service} />
                    <div className="flex flex-wrap gap-2">
                        <Link href={`${productPath(service)}/support`} className="btn btn-sm">
                            {t.support}
                        </Link>
                        <Link href={`${productPath(service)}/privacy`} className="btn btn-sm">
                            {t.privacy}
                        </Link>
                    </div>
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

            {/* Số liệu: thẻ con số như trang chủ app */}
            <section aria-label={t.facts}>
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {copy.facts.map((fact, n) => (
                        <div key={fact.label} style={{ '--i': n + 1 } as CSSProperties} className="sticker rise-in flex min-w-0 flex-col-reverse gap-1 p-4 text-center">
                            <dt className="text-sm text-muted hyphens-auto">{fact.label}</dt>
                            <dd className="font-display text-3xl leading-none font-extrabold text-accent-text tabular-nums">{fact.value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Từng phần học */}
            {shotSections.map(({ section, i, shots }, k) => (
                <section key={section.title} aria-labelledby={`feature-${i}`} className="sticker grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:gap-8">
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
                        <section key={section.title} aria-labelledby={`feature-${i}`} className="sticker p-4 sm:p-6">
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
                            <div key={col.title} style={i ? ({ '--hero': 'var(--accent)' } as CSSProperties) : undefined} className={`sticker flex flex-col gap-3 p-5 ${i ? 'hero' : ''}`}>
                                <h3 className="flex items-center gap-2 text-xl font-extrabold">
                                    <BadgeCheck className="size-6 text-accent-text" /> {col.title}
                                </h3>
                                <ul className="flex flex-col gap-1.5 text-sm">
                                    {col.items.map((item) => (
                                        <li key={item} className="flex gap-2">
                                            <Check className="mt-0.5 size-4 shrink-0 text-accent-text" /> {item}
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
            <section className="card flex flex-col gap-2" aria-labelledby="faq-title">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <h2 id="faq-title" className="section-title">
                        {t.faq}
                    </h2>
                    <Link href={`${productPath(service)}/support`} className={`group ${moreLink}`}>
                        {t.moreFaq} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                    </Link>
                </div>
                {copy.faq.map((item) => (
                    <details key={item.q} className="faq-item group surface p-0 transition-colors open:bg-accent-soft/60">
                        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-ui px-3.5 py-2.5 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent">
                            {item.q}
                            <ChevronDown className="size-5 shrink-0 text-link transition-transform duration-(--dur) group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                        </summary>
                        <p className="px-3.5 pb-3 text-sm text-muted">{item.a}</p>
                    </details>
                ))}
            </section>

            {/* Lời mời cuối trang */}
            <section aria-labelledby="closing-title" style={{ '--hero': 'var(--aqua)' } as CSSProperties} className="sticker hero flex flex-col items-center gap-4 p-6 text-center sm:p-10">
                <h2 id="closing-title" className="section-title text-2xl text-balance sm:text-3xl">
                    {t.closing}
                </h2>
                <p className="lead max-w-xl">{sc.tagline}</p>
                <StartButton service={service} center />
            </section>

            {/* HalloVN cũng nhận làm phần mềm theo yêu cầu */}
            <section aria-labelledby="more-title">
                <Link href="/about#auftrag" className="group sticker sticker-link flex flex-col gap-2 p-5 motion-reduce:hover:translate-y-0">
                    <span className="icon-bubble tint-link size-12">
                        <BriefcaseBusiness className="size-6" aria-hidden="true" />
                    </span>
                    <h2 id="more-title" className="text-xl font-extrabold">
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
