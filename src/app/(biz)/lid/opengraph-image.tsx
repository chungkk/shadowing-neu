import { OG_SIZE, renderOgImage } from '@/biz/lib/ogImage';
import { PRODUCT_PAGES } from '@/biz/lib/productPages';

export const alt = PRODUCT_PAGES.lid.seo.title;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
    return renderOgImage({
        eyebrow: 'iPhone · iPad · Android',
        title: 'Leben in Deutschland Ckk',
        subtitle: 'Einbürgerungstest üben – alle 310 Fragen, die Fragen deines Bundeslands und Testsimulation mit 33 Fragen.',
        accent: '#0a6e5f',
    });
}
