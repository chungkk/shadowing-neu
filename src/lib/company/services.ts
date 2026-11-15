// Sản phẩm của HalloVN: hiện chỉ có một — nền tảng học HalloVN ngay trên hallovn.de.
// Trang giới thiệu (/about), footer, JSON-LD, sitemap đều đọc từ đây; nội dung trang riêng (/shadowing) nằm ở productPages.ts.
// Số liệu (số từ, số câu hỏi) lấy từ dữ liệu thật: src/content/decks/*.json, src/content/fuehrerschein, src/content/lid.
import type { Locale } from '@/components/company/LocaleContext';

export type ServiceId = 'shadowing';

export interface ServiceCopy {
    /** Một dòng ngắn */
    short: string;
    tagline: string;
    features: string[];
    action: string;
    /** Dòng nhỏ cạnh nút bắt đầu */
    note: string;
}

export interface Service {
    id: ServiceId;
    name: string;
    /** Đường dẫn trang riêng, support và bảo mật: /<legalSlug>, /<legalSlug>/support */
    legalSlug: string;
    /** Biến màu mực trong globals.css */
    ink: string;
    /** Chữ trên nền mực */
    onInk: 'light' | 'dark';
    /** Nơi bắt đầu học (đường dẫn trong site) */
    href: string;
    copy: Record<Locale, ServiceCopy>;
}

export const SERVICES: Service[] = [
    {
        id: 'shadowing',
        name: 'HalloVN',
        legalSlug: 'shadowing',
        ink: 'var(--ink-saffron)',
        onInk: 'dark',
        href: '/', // app học ngay trên hallovn.de
        copy: {
            de: {
                short: 'Deutsch, Führerschein und Leben in Deutschland – auf Vietnamesisch',
                tagline: 'Deutsch lernen und in Deutschland ankommen – mit Erklärungen auf Vietnamesisch.',
                features: [
                    'Deutsch mit echten Videos: hören, nachsprechen, mitschreiben',
                    'Goethe-Wortschatz A1–B1, Aspekte B2 und Pflege, mit Vokabelheft',
                    'Führerscheintheorie mit vietnamesischer Übersetzung',
                    'Leben in Deutschland: alle Fragen mit Übersetzung und Testsimulation',
                ],
                action: 'Jetzt lernen',
                note: 'Kostenlos, direkt im Browser. Ein Konto für alles.',
            },
            en: {
                short: 'German, the driving test and Leben in Deutschland – in Vietnamese',
                tagline: 'Learn German and settle in Germany – with explanations in Vietnamese.',
                features: [
                    'German with real videos: listen, repeat, write along',
                    'Goethe vocabulary A1–B1, Aspekte B2 and nursing, with a notebook',
                    'Driving theory test with Vietnamese translation',
                    'Leben in Deutschland: every question translated, plus a mock test',
                ],
                action: 'Start learning',
                note: 'Free, right in your browser. One account for everything.',
            },
            vi: {
                short: 'Tiếng Đức, lý thuyết lái xe và Leben in Deutschland bằng tiếng Việt',
                tagline: 'Học tiếng Đức và ổn định cuộc sống ở Đức, có giải thích bằng tiếng Việt.',
                features: [
                    'Tiếng Đức qua video thật: nghe, nói theo, chép chính tả',
                    'Từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng, có sổ từ để ôn',
                    'Lý thuyết thi bằng lái xe Đức, dịch tiếng Việt từng câu',
                    'Leben in Deutschland: đủ bộ câu hỏi có dịch và thi thử',
                ],
                action: 'Học ngay',
                note: 'Miễn phí, học ngay trên trình duyệt. Một tài khoản cho tất cả.',
            },
        },
    },
];

/** Nền tảng học HalloVN (sản phẩm chính) */
export const PLATFORM = SERVICES[0];

/** Trang riêng của sản phẩm; trang support và bảo mật nằm ngay dưới nó */
export const productPath = (service: Service) => `/${service.legalSlug}`;

/** Hình trên tem của từng phần học (StampArt) */
export type AreaArt = 'wave' | 'cards' | 'road' | 'columns';

export interface LearnArea {
    id: string;
    href: string;
    ink: string;
    onInk: 'light' | 'dark';
    art: AreaArt;
    copy: Record<Locale, { title: string; fact: string; text: string }>;
}

/**
 * Các phần học của HalloVN (khớp các mục trong src/app/(app)/**).
 * Số liệu: 6 bộ từ = 11.562 mục từ (src/content/decks), lái xe 1.746 câu cho 13 hạng (src/content/fuehrerschein),
 * LiD 300 câu chung + 16 bang × 10 câu = 460 (src/content/lid). Làm tròn xuống để không phải sửa mỗi lần thêm dữ liệu.
 */
export const LEARN_AREAS: LearnArea[] = [
    {
        id: 'deutsch',
        href: '/tieng-duc',
        ink: 'var(--ink-saffron)',
        onInk: 'dark',
        art: 'wave',
        copy: {
            de: { title: 'Deutsch mit Videos', fact: 'Shadowing', text: 'Echte Videos Satz für Satz: hören, nachsprechen, mitschreiben' },
            en: { title: 'German with videos', fact: 'Shadowing', text: 'Real videos sentence by sentence: listen, repeat, write along' },
            vi: { title: 'Tiếng Đức qua video', fact: 'Shadowing', text: 'Video thật từng câu: nghe, nói theo, chép chính tả' },
        },
    },
    {
        id: 'vocab',
        href: '/vocab',
        ink: 'var(--ink-petrol)',
        onInk: 'light',
        art: 'cards',
        copy: {
            de: { title: 'Wortschatz', fact: '11.500+', text: 'Wörter und Wendungen in 6 Wortlisten, mit vietnamesischer Bedeutung' },
            en: { title: 'Vocabulary', fact: '11,500+', text: 'words and phrases in 6 word lists, with Vietnamese meanings' },
            vi: { title: 'Từ vựng', fact: '11.500+', text: 'từ và cụm từ trong 6 bộ, có nghĩa tiếng Việt' },
        },
    },
    {
        id: 'fuehrerschein',
        href: '/lai-xe',
        ink: 'var(--ink-vermilion)',
        onInk: 'light',
        art: 'road',
        copy: {
            de: { title: 'Führerschein', fact: '1.700+', text: 'offizielle Theoriefragen für 13 Klassen, übersetzt' },
            en: { title: 'Driving test', fact: '1,700+', text: 'official theory questions for 13 licence classes, translated' },
            vi: { title: 'Lái xe', fact: '1.700+', text: 'câu lý thuyết chính thức cho 13 hạng bằng, có dịch' },
        },
    },
    {
        id: 'lid',
        href: '/leben-in-deutschland',
        ink: 'var(--ink)',
        onInk: 'light',
        art: 'columns',
        copy: {
            de: { title: 'Leben in Deutschland', fact: '460', text: 'Fragen: 300 allgemeine und 10 je Bundesland' },
            en: { title: 'Leben in Deutschland', fact: '460', text: 'questions: 300 general and 10 per federal state' },
            vi: { title: 'Leben in Deutschland', fact: '460', text: 'câu hỏi: 300 câu chung và 10 câu mỗi bang' },
        },
    },
];
