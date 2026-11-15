'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { COMPANY, SITE } from '@/lib/company/site';
import { LEARN_AREAS, PLATFORM, productPath } from '@/lib/company/services';
import type { LearnArea } from '@/lib/company/services';
import { PRODUCT_PAGES } from '@/lib/company/productPages';
import { useLocale, useT } from '@/components/company/LocaleContext';
import { Shot, StartButton, inkText } from '@/components/company/ProductParts';
import ProjectForm from '@/components/company/ProjectForm';
import { StampArt } from '@/components/company/StampArt';
import { ArrowRightIcon } from '@/components/company/icons';

const COPY = {
    de: {
        h1a: 'Deutsch lernen.',
        h1b: 'In Deutschland ankommen.',
        lead: 'HalloVN ist die kostenlose Lernplattform für Vietnamesen in Deutschland. Mit Erklärungen auf Vietnamesisch.',
        cta: 'Jetzt lernen',
        ctaProject: 'Software nach Maß',
        sheetNote: 'Kostenlos · ein Konto für alles · Oberfläche auf Vietnamesisch',
        forTitle: 'Gemacht für Vietnamesen in Deutschland.',
        forDesc:
            'Ob Studium, Ausbildung, Arbeit oder Familiennachzug: Wer neu in Deutschland ist, braucht Deutsch, oft einen Führerschein und irgendwann den Test Leben in Deutschland. HalloVN bündelt das an einem Ort.',
        appNote: 'Läuft im Browser, auch auf dem Handy. Eine App für iOS und Android mit demselben Konto ist in Arbeit.',
        details: 'Alles über die Lernplattform',
        support: 'Support',
        privacy: 'Datenschutz',
        projectTitle: 'Wir bauen auch Ihre Software.',
        projectDesc: 'HalloVN entwickeln und betreiben wir selbst, von der Datenbank bis zur Oberfläche. Genauso bauen wir Web-Anwendungen und Apps nach Ihren Anforderungen.',
        proof: [
            { title: 'Web-Anwendungen mit Nutzerkonten', from: 'Anmeldung, Fortschritt und Statistik, wie bei HalloVN' },
            { title: 'Inhalte und Daten aufbereiten', from: 'Fragenkataloge, Wortlisten, Untertitel und Übersetzungen' },
            { title: 'Mehrsprachige Oberflächen', from: 'Deutsch, Englisch und Vietnamesisch' },
        ],
        contactTitle: 'Kontakt',
        contactDesc: 'Fragen zu HalloVN, Kooperation oder ein Projekt: Wir melden uns in der Regel innerhalb von 1–2 Werktagen.',
        supportCenter: 'Zum Support-Center',
    },
    en: {
        h1a: 'Learn German.',
        h1b: 'Settle in Germany.',
        lead: 'HalloVN is the free learning platform for Vietnamese people in Germany. With explanations in Vietnamese.',
        cta: 'Start learning',
        ctaProject: 'Custom software',
        sheetNote: 'Free · one account for everything · interface in Vietnamese',
        forTitle: 'Made for Vietnamese people in Germany.',
        forDesc:
            'Whether you come to study, train, work or join family: if you are new to Germany, you need German, often a driving licence and at some point the Leben in Deutschland test. HalloVN brings it all together in one place.',
        appNote: 'Runs in the browser, on your phone too. An app for iOS and Android using the same account is in the works.',
        details: 'All about the learning platform',
        support: 'Support',
        privacy: 'Privacy',
        projectTitle: 'We build your software too.',
        projectDesc: 'We develop and run HalloVN ourselves, from the database to the interface. In the same way we build web applications and apps to your requirements.',
        proof: [
            { title: 'Web applications with user accounts', from: 'Sign-in, progress and statistics, as in HalloVN' },
            { title: 'Preparing content and data', from: 'Question catalogues, word lists, subtitles and translations' },
            { title: 'Multilingual interfaces', from: 'German, English and Vietnamese' },
        ],
        contactTitle: 'Contact',
        contactDesc: 'Questions about HalloVN, partnerships or a project: we usually reply within 1–2 working days.',
        supportCenter: 'Go to the support center',
    },
    vi: {
        h1a: 'Học tiếng Đức.',
        h1b: 'Sống tốt ở Đức.',
        lead: 'HalloVN là nền tảng học miễn phí cho người Việt ở Đức, có giải thích bằng tiếng Việt.',
        cta: 'Học ngay',
        ctaProject: 'Làm phần mềm theo yêu cầu',
        sheetNote: 'Miễn phí · một tài khoản cho tất cả · giao diện tiếng Việt',
        forTitle: 'Làm cho người Việt ở Đức.',
        forDesc:
            'Du học, học nghề, đi làm hay đoàn tụ gia đình: mới sang Đức thì cần tiếng Đức, thường cần bằng lái xe và đến lúc nào đó là bài thi Leben in Deutschland. HalloVN gom tất cả vào một chỗ.',
        appNote: 'Dùng ngay trên trình duyệt, kể cả trên điện thoại. App cho iOS và Android dùng chung tài khoản đang được phát triển.',
        details: 'Xem chi tiết nền tảng học',
        support: 'Hỗ trợ',
        privacy: 'Bảo mật',
        projectTitle: 'Chúng tôi cũng làm phần mềm cho bạn.',
        projectDesc: 'HalloVN do chính chúng tôi phát triển và vận hành, từ cơ sở dữ liệu đến giao diện. Ứng dụng web và app theo yêu cầu của bạn, chúng tôi cũng làm như vậy.',
        proof: [
            { title: 'Ứng dụng web có tài khoản người dùng', from: 'Đăng nhập, lưu tiến độ và thống kê, như HalloVN' },
            { title: 'Xử lý nội dung và dữ liệu', from: 'Bộ câu hỏi, danh sách từ, phụ đề và bản dịch' },
            { title: 'Giao diện đa ngôn ngữ', from: 'Tiếng Đức, Anh và Việt' },
        ],
        contactTitle: 'Liên hệ',
        contactDesc: 'Hỏi về HalloVN, hợp tác hay dự án phần mềm: chúng tôi thường trả lời trong 1–2 ngày làm việc.',
        supportCenter: 'Đến trung tâm hỗ trợ',
    },
};

/** Một con tem trên tờ: dẫn tới một phần học của HalloVN */
function Stamp({ area, index }: { area: LearnArea; index: number }) {
    const { locale } = useLocale();
    const copy = area.copy[locale];
    return (
        <Link href={area.href} className="stamp perf flex min-h-[19rem] p-2.5 md:p-3 xl:min-h-[27rem]">
            <span className="stamp-face flex w-full flex-col p-3 md:p-4" style={{ '--stamp-ink': area.ink, '--i': index, background: area.ink, color: inkText(area) } as CSSProperties}>
                <span className="flex items-baseline justify-between gap-2 text-sm font-semibold">
                    <span>HalloVN</span>
                    <ArrowRightIcon className="h-4 w-4 shrink-0" />
                </span>
                <StampArt art={area.art} className="my-3 min-h-0 w-full flex-1 md:my-4" />
                <span className="font-display text-xl font-bold leading-[1.05] tracking-tight text-balance md:text-[1.7rem]">{copy.title}</span>
                <span className="mt-2 text-[0.82rem] leading-snug md:text-sm">
                    <span className="font-bold tabular-nums">{copy.fact}</span> {copy.text}
                </span>
            </span>
        </Link>
    );
}

/** Dải giới thiệu nền tảng học: cho ai, có gì, bắt đầu ở đâu */
function PlatformBand() {
    const { locale } = useLocale();
    const t = useT(COPY);
    const service = PLATFORM;
    const page = PRODUCT_PAGES[service.id];
    const hero = page.hero[0];
    return (
        <section id="lernen" aria-labelledby="lernen-title" className="on-ink perf-top scroll-mt-16" style={{ '--stamp-ink': service.ink, '--band': service.ink, color: inkText(service) } as CSSProperties}>
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-12 lg:gap-14">
                <div className="min-w-0 lg:col-span-7">
                    <h2 id="lernen-title" className="font-display text-5xl font-bold leading-[0.98] tracking-tight text-balance md:text-7xl">
                        {t.forTitle}
                    </h2>
                    <p className="mt-5 max-w-[34rem] text-xl leading-snug">{t.forDesc}</p>
                    <ul className="mt-8 max-w-[38rem] border-t border-current/35">
                        {service.copy[locale].features.map((feature) => (
                            <li key={feature} className="border-b border-current/35 py-2.5">
                                {feature}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-8">
                        <StartButton service={service} />
                    </div>
                    <p className="mt-4 max-w-[34rem] text-sm">{t.appNote}</p>
                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold">
                        <Link href={productPath(service)} className="group inline-flex items-center gap-2 font-display text-lg font-bold underline underline-offset-4">
                            {t.details}
                            <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link href={`${productPath(service)}/support`} className="underline underline-offset-4">{t.support}</Link>
                        <Link href={`${productPath(service)}/privacy`} className="underline underline-offset-4">{t.privacy}</Link>
                    </div>
                </div>
                <div className="lg:col-span-5">
                    <Shot screen={page.screens[hero]} alt={page.copy[locale].alts[hero]} sizes="(min-width: 1024px) 28rem, 100vw" />
                </div>
            </div>
        </section>
    );
}

export default function HomeContent() {
    const t = useT(COPY);
    return (
        <>
            <section id="start" aria-labelledby="home-title" className="scroll-mt-16 overflow-x-clip">
                <div className="mx-auto max-w-[88rem] px-4 pb-6 pt-8 sm:px-6 md:pt-10">
                    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
                        <h1 id="home-title" className="font-display text-[clamp(2.75rem,5.2vw,6rem)] font-bold leading-[0.96] tracking-[-0.035em] lg:col-span-8">
                            <span className="block">{t.h1a}</span>
                            <span className="block text-[var(--ink-ultra)]">{t.h1b}</span>
                        </h1>
                        <div className="lg:col-span-4 lg:pb-2">
                            <p className="max-w-[26rem] text-lg leading-snug">{t.lead}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                                <Link
                                    href={PLATFORM.href}
                                    className="inline-flex min-h-12 items-center gap-2 bg-[var(--ink-ultra)] px-5 py-3 font-display text-lg font-bold text-white transition-colors hover:bg-[var(--ink)]"
                                >
                                    {t.cta}
                                    <ArrowRightIcon className="h-5 w-5" />
                                </Link>
                                <a href="#auftrag" className="font-semibold underline underline-offset-4 hover:text-[var(--ink-ultra)]">
                                    {t.ctaProject}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="mt-7 grid grid-cols-2 lg:grid-cols-4">
                        {LEARN_AREAS.map((area, i) => (
                            <Stamp key={area.id} area={area} index={i} />
                        ))}
                    </div>

                    {/* Lề tờ tem: dải màu kiểm tra in, mỗi ô là một màu mực đang dùng */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
                        <span aria-hidden="true" className="flex">
                            {LEARN_AREAS.map((area) => (
                                <span key={area.id} className="h-3 w-6" style={{ background: area.ink }} />
                            ))}
                            <span className="h-3 w-6 bg-[var(--ink-ultra)]" />
                        </span>
                        <span>{t.sheetNote}</span>
                    </div>
                </div>
            </section>

            <div className="pt-8">
                <PlatformBand />

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
