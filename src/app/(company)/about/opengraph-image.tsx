import { OG_SIZE, renderOgImage } from '@/lib/company/ogImage';

export const alt = 'HalloVN – Software, Apps und Web-Anwendungen';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
    return renderOgImage({
        eyebrow: 'Software · Apps · Web',
        title: 'HalloVN – Software, Apps und Web-Anwendungen',
        subtitle: 'Führerschein Theorie, Leben in Deutschland, HalloVN – und Software nach Ihren Anforderungen.',
        accent: '#2438c9',
    });
}
