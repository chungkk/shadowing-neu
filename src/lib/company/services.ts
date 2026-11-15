// Danh mục dịch vụ của HalloVN. Trang chủ, footer, JSON-LD đều đọc từ đây:
// thêm dịch vụ mới = thêm một mục vào SERVICES, nội dung trang riêng vào productPages.ts,
// ảnh vào public/apps/<id>/, route src/app/<legalSlug>/page.tsx (và một hình tem trong StampArt nếu cần).
import type { Locale } from '@/components/company/LocaleContext';

export type ServiceId = 'shadowing';

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

export const SERVICES: Service[] = [
    {
        id: 'shadowing',
        no: 1,
        name: 'HalloVN',
        legalSlug: 'shadowing',
        ink: 'var(--ink-saffron)',
        onInk: 'dark',
        platform: 'Web',
        href: '/', // app học ngay trên hallovn.de
        copy: {
            de: {
                short: 'Deutsch hören, sprechen und schreiben',
                tagline: 'Deutsch hören, sprechen und schreiben, mit echten Videos.',
                features: [
                    'Video-Lektionen von A1 bis C2',
                    'Eigene YouTube-Videos zum Üben einfügen',
                    'Vokabeln, Sprechen und Lernspiele',
                ],
                action: 'Jetzt lernen',
                note: 'Direkt hier auf hallovn.de – ein Konto für Deutsch, Führerschein und Leben in Deutschland.',
            },
            en: {
                short: 'Listen to, speak and write German',
                tagline: 'Listen to, speak and write German with real videos.',
                features: [
                    'Video lessons from A1 to C2',
                    'Practise with any YouTube video you paste in',
                    'Vocabulary, speaking and learning games',
                ],
                action: 'Start learning',
                note: 'Right here on hallovn.de – one account for German, the driving test and Leben in Deutschland.',
            },
            vi: {
                short: 'Luyện nghe, nói và viết tiếng Đức',
                tagline: 'Luyện nghe, nói và chép chính tả tiếng Đức với video thật.',
                features: [
                    'Bài học video từ A1 đến C2',
                    'Dán link YouTube để tự luyện',
                    'Từ vựng, luyện nói và game học tập',
                ],
                action: 'Học ngay',
                note: 'Ngay trên hallovn.de – một tài khoản cho tiếng Đức, lái xe và Leben in Deutschland.',
            },
        },
    },
];

/** Trang riêng của sản phẩm; trang support và bảo mật nằm ngay dưới nó */
export const productPath = (service: Service) => `/${service.legalSlug}`;
