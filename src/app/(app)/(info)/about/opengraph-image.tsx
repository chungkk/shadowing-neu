import { OG_SIZE, renderOgImage } from '@/lib/company/ogImage';

export const alt = 'Über HalloVN – Lernplattform für Vietnamesen in Deutschland und Software nach Maß';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
    return renderOgImage({
        eyebrow: 'Über HalloVN',
        title: 'Deutsch lernen und in Deutschland ankommen',
        subtitle: 'Die kostenlose Lernplattform für Vietnamesen in Deutschland – und Software nach Ihren Anforderungen.',
        accent: '#2438c9',
    });
}
