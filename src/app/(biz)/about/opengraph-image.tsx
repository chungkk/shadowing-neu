import { OG_SIZE, renderOgImage } from '@/biz/lib/ogImage';

export const alt = 'CKK – Software, Apps und Web-Anwendungen';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
    return renderOgImage({
        eyebrow: 'Software · Apps · Web',
        title: 'CKK – Software, Apps und Web-Anwendungen',
        subtitle: 'Führerschein Theorie, Leben in Deutschland, Deutsch Shadowing – und Software nach Ihren Anforderungen.',
        accent: '#2438c9',
    });
}
