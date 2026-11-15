import { OG_SIZE, renderOgImage } from '@/lib/company/ogImage';
import { PRODUCT_PAGES } from '@/lib/company/productPages';

export const alt = PRODUCT_PAGES.fuehrerschein.seo.title;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
    return renderOgImage({
        eyebrow: 'iPhone · iPad · Android',
        title: 'Führerschein Theorie HalloVN',
        subtitle: 'Theorieprüfung für 13 Klassen – alle amtlichen Fragen, Prüfungssimulation, Übersetzung in 5 Sprachen.',
        accent: '#c92f16',
    });
}
