import { OG_SIZE, renderOgImage } from '@/lib/company/ogImage';

export const alt = 'HalloVN – Deutsch, Führerschein und Leben in Deutschland auf Vietnamesisch';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
    return renderOgImage({
        eyebrow: 'Lernplattform · kostenlos',
        title: 'Deutsch lernen, auf Vietnamesisch erklärt',
        subtitle: 'Videos, Goethe-Wortschatz, Führerscheintheorie und Leben in Deutschland – ein Konto für alles.',
        accent: '#f4b400',
    });
}
