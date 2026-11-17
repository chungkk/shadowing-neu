'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { ArrowRight, BookMarked, Car, Check, Database, Info, Landmark, Languages, Mail, MapPin, MonitorSmartphone, UsersRound } from 'lucide-react';
import { COMPANY, SITE } from '@/lib/company/site';
import { LEARN_AREAS, PLATFORM, productPath } from '@/lib/company/services';
import type { LearnArea } from '@/lib/company/services';
import { PRODUCT_PAGES } from '@/lib/company/productPages';
import { useLocale, useT } from '@/components/company/LocaleContext';
import { Shot, StartButton } from '@/components/company/ProductParts';
import ProjectForm from '@/components/company/ProjectForm';
import PageHeader from '@/components/PageHeader';

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

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

/** Icon và màu khu vực (data-sec → màu bìa vở) của từng phần — cùng màu với ba cuốn vở trên trang chủ app */
const AREA_LOOK: Record<LearnArea['id'], { icon: Icon; sec: string }> = {
    deutsch: { icon: Languages, sec: 'de' },
    vocab: { icon: BookMarked, sec: 'de' },
    fuehrerschein: { icon: Car, sec: 'laixe' },
    lid: { icon: Landmark, sec: 'lid' },
};

/** Icon cho 3 việc làm theo yêu cầu (t.proof, cùng thứ tự) */
const PROOF_ICONS: Icon[] = [UsersRound, Database, MonitorSmartphone];

/** Tiêu đề khối + câu dẫn, như "HalloVN có gì?" trên trang chủ */
function SectionHead({ id, title, text }: { id: string; title: string; text?: string }) {
    return (
        <div className="flex flex-col gap-1">
            <h2 id={id} className="section-title text-2xl text-balance sm:text-3xl">
                {title}
            </h2>
            {text && <p className="max-w-3xl text-muted">{text}</p>}
        </div>
    );
}

/** Thẻ một phần học: dải bìa màu của khu (icon), tên, con số và mô tả — bấm vào là tới phần đó */
function AreaCard({ area }: { area: LearnArea }) {
    const { locale } = useLocale();
    const copy = area.copy[locale];
    const look = AREA_LOOK[area.id];
    return (
        <Link href={area.href} data-sec={look.sec} className="group sticker card-link flex flex-col overflow-hidden motion-reduce:hover:translate-y-0">
            <span className="cover flex h-14 items-center justify-between rounded-none pr-3 pl-7 sm:h-16 sm:pr-4">
                <look.icon className="size-6 sm:size-7" strokeWidth={2.25} aria-hidden="true" />
                <ArrowRight className="size-5 transition-transform duration-(--dur) group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
            </span>
            <span className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
                <span className="leading-snug font-semibold sm:text-lg">{copy.title}</span>
                <span className="font-display text-[1.75rem] leading-none font-extrabold tracking-[-0.03em] tabular-nums sm:text-3xl">{copy.fact}</span>
                <span className="text-sm text-muted">{copy.text}</span>
            </span>
        </Link>
    );
}

/** Giới thiệu nền tảng học: cho ai, có gì, bắt đầu ở đâu */
function PlatformSection() {
    const { locale } = useLocale();
    const t = useT(COPY);
    const service = PLATFORM;
    const page = PRODUCT_PAGES[service.id];
    const hero = page.hero[0];
    return (
        <section id="lernen" aria-labelledby="lernen-title" className="flex scroll-mt-20 flex-col gap-4">
            <SectionHead id="lernen-title" title={t.forTitle} text={t.forDesc} />
            <div className="sticker grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-4">
                    <ul className="flex flex-col gap-2">
                        {service.copy[locale].features.map((feature) => (
                            <li key={feature} className="flex gap-2">
                                <Check className="mt-0.5 size-5 shrink-0 text-ok-text" /> {feature}
                            </li>
                        ))}
                    </ul>
                    <StartButton service={service} />
                    <p className="text-sm text-muted">{t.appNote}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href={productPath(service)} className="btn">
                            {t.details} <ArrowRight className="size-4" />
                        </Link>
                        <Link href={`${productPath(service)}/support`} className="btn btn-sm">
                            {t.support}
                        </Link>
                        <Link href={`${productPath(service)}/privacy`} className="btn btn-sm">
                            {t.privacy}
                        </Link>
                    </div>
                </div>
                <Shot screen={page.screens[hero]} alt={page.copy[locale].alts[hero]} sizes="(min-width: 1024px) 34rem, 100vw" />
            </div>
        </section>
    );
}

export default function HomeContent() {
    const t = useT(COPY);
    return (
        <div className="page gap-10 md:gap-14">
            {/* Mở đầu: bìa vở mực + nhãn vở (PageHeader) có linh vật — trang tổng quan của khu thông tin */}
            <section id="start" className="scroll-mt-20">
                <PageHeader
                    sec="ink"
                    icon={Info}
                    mascot
                    title={
                        <span id="home-title" className="text-balance">
                            {t.h1a} <span className="highlight">{t.h1b}</span>
                        </span>
                    }
                    sub={
                        <>
                            {t.lead} <span className="mt-1 block text-sm">{t.sheetNote}</span>
                        </>
                    }
                    actions={
                        <>
                            <Link href={PLATFORM.href} className="btn btn-primary btn-lg max-sm:w-full">
                                {t.cta} <ArrowRight className="size-5" />
                            </Link>
                            <a href="#auftrag" className="btn btn-lg max-sm:w-full">
                                {t.ctaProject}
                            </a>
                        </>
                    }
                />
            </section>

            {/* Các phần học: thẻ số liệu bấm được */}
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {LEARN_AREAS.map((area) => (
                    <li key={area.id} className="flex *:flex-1">
                        <AreaCard area={area} />
                    </li>
                ))}
            </ul>

            <PlatformSection />

            {/* Làm phần mềm theo yêu cầu */}
            <section id="auftrag" aria-labelledby="auftrag-title" className="flex scroll-mt-20 flex-col gap-4">
                <SectionHead id="auftrag-title" title={t.projectTitle} text={t.projectDesc} />
                <div className="grid items-start gap-4 lg:grid-cols-2">
                    <ul className="card flex flex-col divide-y divide-line p-0 dark:divide-border">
                        {t.proof.map((item, i) => {
                            const ProofIcon = PROOF_ICONS[i] ?? Check;
                            return (
                                <li key={item.title} className="flex items-center gap-3 p-4 sm:px-5">
                                    <span className="icon-bubble tint-muted">
                                        <ProofIcon className="size-5" aria-hidden="true" />
                                    </span>
                                    <span className="flex min-w-0 flex-col">
                                        <span className="font-semibold">{item.title}</span>
                                        <span className="text-sm text-muted">{item.from}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="card p-5 sm:p-6">
                        <ProjectForm />
                    </div>
                </div>
            </section>

            {/* Liên hệ: trang giấy ô ly như khối kêu gọi cuối trang chủ */}
            <section
                id="contact"
                aria-labelledby="contact-title"
                className="o-ly flex scroll-mt-20 flex-col items-start gap-4 rounded-[var(--radius-xl)] border border-line p-6 sm:p-10 dark:border-border"
            >
                <h2 id="contact-title" className="font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.4rem)] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance">
                    {t.contactTitle}
                </h2>
                <p className="lead max-w-xl">{t.contactDesc}</p>
                <div className="flex w-full max-w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                    <a href={`mailto:${SITE.contactEmail}`} className="btn btn-primary btn-lg max-w-full break-all">
                        <Mail className="size-5 shrink-0" /> {SITE.contactEmail}
                    </a>
                    <Link href="/support" className="btn btn-lg">
                        {t.supportCenter} <ArrowRight className="size-5" />
                    </Link>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="size-4" /> {COMPANY.postalCity}
                </p>
            </section>
        </div>
    );
}
