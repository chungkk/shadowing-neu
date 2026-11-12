// Danh mục dịch vụ của CKK. Trang chủ, footer, JSON-LD đều đọc từ đây:
// thêm dịch vụ mới = thêm một mục vào SERVICES, nội dung trang riêng vào productPages.ts,
// ảnh vào public/apps/<id>/, route src/app/<legalSlug>/page.tsx (và một hình tem trong StampArt nếu cần).
import catalog from '@/../content/laixe/catalog_all/manifest.json';
import { APP_LINKS } from '@/biz/lib/site';
import type { Locale } from '@/biz/contexts/LocaleContext';

export type ServiceId = 'fuehrerschein' | 'lid' | 'shadowing';

export interface ServiceCopy {
    /** Một dòng ngắn trên con tem */
    short: string;
    tagline: string;
    features: string[];
    action: string;
    /** Điều chỉ đúng với riêng sản phẩm này */
    note: string;
}

export interface Service {
    id: ServiceId;
    no: number;
    name: string;
    /** Đường dẫn trang support và bảo mật: /<legalSlug>/support */
    legalSlug: string;
    /** Biến màu mực trong globals.css */
    ink: string;
    /** Chữ trên nền mực */
    onInk: 'light' | 'dark';
    platform: 'iOS' | 'Web';
    href: string;
    /** Bản Android tải trực tiếp dạng APK (không có trên Google Play) */
    android?: { href: string; copy: Record<Locale, { action: string; note: string }> };
    copy: Record<Locale, ServiceCopy>;
}

const count = (locale: string) => catalog.questionCount.toLocaleString(locale);
const CLASSES = 'B, A, A1, A2, AM, Mofa, C, C1, CE, D, D1, L, T';
/** Đổi thành false để tạm ẩn nút tải APK Android (xem docs/downloads.md). */
const SHOW_ANDROID_APK = true;
/** Đổi thành false để tạm ẩn nút tải APK Android của Leben in Deutschland. */
const SHOW_LID_ANDROID_APK = true;

const APK_COPY: Record<Locale, { action: string; note: string }> = {
    de: {
        action: 'APK für Android laden',
        note: 'Für Android: Datei laden und die Installation aus unbekannten Quellen erlauben.',
    },
    en: {
        action: 'Download APK for Android',
        note: 'For Android: download the file and allow installs from unknown sources.',
    },
    vi: {
        action: 'Tải APK cho Android',
        note: 'Cho Android: tải file về rồi cho phép cài ứng dụng từ nguồn không xác định.',
    },
};

export const SERVICES: Service[] = [
    {
        id: 'fuehrerschein',
        no: 1,
        name: 'Führerschein Theorie Ckk',
        legalSlug: 'fuehrerschein',
        ink: 'var(--ink-vermilion)',
        onInk: 'light',
        platform: 'iOS',
        href: APP_LINKS.fuehrerschein,
        android: SHOW_ANDROID_APK ? { href: APP_LINKS.fuehrerscheinAndroid, copy: APK_COPY } : undefined,
        copy: {
            de: {
                short: 'Theorieprüfung für 13 Führerscheinklassen',
                tagline: 'Theorieprüfung für 13 Führerscheinklassen, mit Übersetzung in 5 Sprachen.',
                features: [
                    `Alle ${count('de-DE')} amtlichen Fragen`,
                    `Klassen ${CLASSES}`,
                    'Bilder und Videofragen wie in der Prüfung',
                    'Prüfungssimulation mit Fehlerpunkten',
                    'Vietnamesisch, Englisch, Arabisch, Chinesisch, Russisch',
                ],
                action: 'Im App Store laden',
                note: 'Für iPhone und iPad. Käufe laufen über Apple.',
            },
            en: {
                short: 'Theory test for 13 licence classes',
                tagline: 'The German driving theory test for 13 licence classes, translated into 5 languages.',
                features: [
                    `All ${count('en-US')} official questions`,
                    `Classes ${CLASSES}`,
                    'Image and video questions as in the real test',
                    'Exam simulation with penalty points',
                    'Vietnamese, English, Arabic, Chinese, Russian',
                ],
                action: 'Get it on the App Store',
                note: 'For iPhone and iPad. Purchases are handled by Apple.',
            },
            vi: {
                short: 'Thi lý thuyết cho 13 hạng bằng lái',
                tagline: 'Ôn thi lý thuyết lái xe tại Đức cho 13 hạng bằng, có bản dịch 5 ngôn ngữ.',
                features: [
                    `Toàn bộ ${count('vi-VN')} câu hỏi chính thức`,
                    `Các hạng ${CLASSES}`,
                    'Câu hỏi hình ảnh và video như khi thi thật',
                    'Thi thử có tính điểm lỗi',
                    'Tiếng Việt, Anh, Ả Rập, Trung, Nga',
                ],
                action: 'Tải trên App Store',
                note: 'Dành cho iPhone và iPad. Thanh toán qua Apple.',
            },
        },
    },
    {
        id: 'lid',
        no: 2,
        name: 'Leben in Deutschland Ckk',
        legalSlug: 'lid',
        ink: 'var(--ink-petrol)',
        onInk: 'light',
        platform: 'iOS',
        href: APP_LINKS.lid,
        android: SHOW_LID_ANDROID_APK ? { href: APP_LINKS.lidAndroid, copy: APK_COPY } : undefined,
        copy: {
            de: {
                short: 'Einbürgerungs- und Orientierungstest',
                tagline: 'Einbürgerungs- und Orientierungstest, zweisprachig.',
                features: [
                    '300 allgemeine Fragen und 10 je Bundesland',
                    'Übersetzung zu jeder Frage und Antwort',
                    'Testsimulation mit 33 Fragen',
                    'Auswahl des eigenen Bundeslands',
                    'Statistiken zu Stärken und Schwächen',
                ],
                action: 'Im App Store laden',
                note: 'Für iPhone und iPad. Käufe laufen über Apple.',
            },
            en: {
                short: 'Citizenship and orientation test',
                tagline: 'The citizenship and orientation test, in two languages.',
                features: [
                    '300 general questions plus 10 per federal state',
                    'A translation for every question and answer',
                    'Test simulation with 33 questions',
                    'Choose your own federal state',
                    'Statistics on strengths and weak spots',
                ],
                action: 'Get it on the App Store',
                note: 'For iPhone and iPad. Purchases are handled by Apple.',
            },
            vi: {
                short: 'Bài thi nhập tịch và định hướng',
                tagline: 'Ôn bài thi nhập tịch và định hướng, song ngữ.',
                features: [
                    '300 câu chung và 10 câu theo từng bang',
                    'Có bản dịch cho mọi câu hỏi và đáp án',
                    'Thi thử 33 câu',
                    'Chọn bang bạn đang sống',
                    'Thống kê điểm mạnh và điểm yếu',
                ],
                action: 'Tải trên App Store',
                note: 'Dành cho iPhone và iPad. Thanh toán qua Apple.',
            },
        },
    },
    {
        id: 'shadowing',
        no: 3,
        name: 'Deutsch Shadowing',
        legalSlug: 'shadowing',
        ink: 'var(--ink-saffron)',
        onInk: 'dark',
        platform: 'Web',
        href: 'https://ckk.pro',
        copy: {
            de: {
                short: 'Deutsch hören, sprechen und schreiben',
                tagline: 'Deutsch hören, sprechen und schreiben, mit echten Videos.',
                features: [
                    'Video-Lektionen von A1 bis C2',
                    'Eigene YouTube-Videos zum Üben einfügen',
                    'Vokabeln, Sprechen und Lernspiele',
                ],
                action: 'Zu ckk.pro',
                note: 'Eigene Website unter ckk.pro. Ein Produkt von CKK.',
            },
            en: {
                short: 'Listen to, speak and write German',
                tagline: 'Listen to, speak and write German with real videos.',
                features: [
                    'Video lessons from A1 to C2',
                    'Practise with any YouTube video you paste in',
                    'Vocabulary, speaking and learning games',
                ],
                action: 'Go to ckk.pro',
                note: 'Its own website at ckk.pro. A CKK product.',
            },
            vi: {
                short: 'Luyện nghe, nói và viết tiếng Đức',
                tagline: 'Luyện nghe, nói và chép chính tả tiếng Đức với video thật.',
                features: [
                    'Bài học video từ A1 đến C2',
                    'Dán link YouTube để tự luyện',
                    'Từ vựng, luyện nói và game học tập',
                ],
                action: 'Đến ckk.pro',
                note: 'Trang web riêng tại ckk.pro. Một sản phẩm của CKK.',
            },
        },
    },
];

/** Trang riêng của sản phẩm; trang support và bảo mật nằm ngay dưới nó */
export const productPath = (service: Service) => `/${service.legalSlug}`;
